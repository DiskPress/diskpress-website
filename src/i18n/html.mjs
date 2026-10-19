import { createHash } from 'node:crypto';
import { allPaths, localePath, locales, splitLocale } from './routes.mjs';

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const untouched = new Set(['script', 'style', 'pre', 'code', 'svg']);
const inline = new Set(['a', 'strong', 'em', 'b', 'i', 'span', 'time', 'br', 'code', 'svg', 'small', 'sup', 'sub', 'abbr']);
const groups = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'li', 'summary', 'figcaption', 'th', 'td', 'caption', 'button', 'a', 'span', 'time', 'title', 'dt', 'dd']);
const textAttributes = new Set(['alt', 'title', 'aria-label', 'placeholder', 'data-copy-label', 'data-copied-label', 'data-copy-success', 'data-copy-failure']);
const metadata = new Set(['description', 'og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description', 'twitter:image:alt']);
const unchangedNames = new Set(['DiskPress', 'DiskPress for Files', 'App Archiver', 'Storage Saver Duo', 'Storage Saver Trio', 'Mac', 'iPhone', 'iPad', 'iOS', 'iPadOS', 'macOS', 'Mac App Store', 'App Store', 'iOS App Store', 'Setapp', 'GitHub', 'Ighor July', 'LZFSE', 'APFS', 'JSON', 'CLI', 'Shell', 'MB', 'GB']);
export const normalize = value => value.replace(/\s+/gu, ' ').trim();
// Astro may retain a space between inline elements that a source preview omits.
// Ignore only whitespace between markup tokens when identifying a message.
// Keep the original text and translated spacing unchanged when rendering.
export const messageId = value => createHash('sha256').update(normalize(value).replace(/(\{\/?\d+\})\s+(?=\{\/?\d+\})/g, '$1')).digest('hex').slice(0, 12);
export const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function decodeHtml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[entity.toLowerCase()];
  });
}
function needsTranslation(text) {
  const plain = normalize(text.replace(/\{\/?\d+\}/g, ''));
  return /[a-z]/i.test(plain) && !unchangedNames.has(plain) && !/^(?:DiskPress(?: for Files)? v|Mac |iOS )?\d+(?:\.\d+)+(?:[a-z])?$/.test(plain) && !/^\d+(?:\.\d+)? (?:MB|GB|KB)$/.test(plain) && !/^(?:support@apptrust\.app|https?:\/\/\S+)$/.test(plain);
}
export function parseHtml(html) {
  const root = { tag: '#root', children: [] };
  const stack = [root];
  const tags = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi;
  let cursor = 0;
  let match;
  const addText = text => { if (text) stack.at(-1).children.push({ tag: '#text', raw: text }); };
  while ((match = tags.exec(html))) {
    addText(html.slice(cursor, match.index));
    const raw = match[0];
    cursor = tags.lastIndex;
    if (raw.startsWith('<!')) { stack.at(-1).children.push({ tag: '#raw', raw }); continue; }
    const tag = raw.match(/^<\/?([^\s/>]+)/)[1].toLowerCase();
    if (raw.startsWith('</')) {
      if (stack.at(-1).tag !== tag) throw new Error('Unbalanced HTML closing ' + tag);
      stack.pop().close = raw;
      continue;
    }
    const attrs = Object.fromEntries([...raw.matchAll(/\s([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(([, key, a, b, c]) => [key, decodeHtml(a ?? b ?? c ?? '')]));
    const node = { tag, open: raw, close: '', attrs, children: [] };
    stack.at(-1).children.push(node);
    if (tag === 'script' || tag === 'style') {
      const end = html.toLowerCase().indexOf('</' + tag + '>', cursor);
      if (end < 0) throw new Error('Unclosed raw HTML element ' + tag);
      node.children.push({ tag: '#raw', raw: html.slice(cursor, end) });
      node.close = html.slice(end, end + tag.length + 3);
      cursor = end + tag.length + 3;
      tags.lastIndex = cursor;
    } else if (!voidTags.has(tag) && !raw.endsWith('/>')) stack.push(node);
  }
  addText(html.slice(cursor));
  if (stack.length !== 1) throw new Error('Unclosed HTML element ' + stack.at(-1).tag);
  return root;
}
const original = node => node.raw ?? (node.open || '') + node.children.map(original).join('') + (node.close || '');
const isPhrasing = node => node.tag === '#text' || inline.has(node.tag) && (untouched.has(node.tag) || node.children.every(isPhrasing));

/** Extract complete sentences with numbered inline-markup placeholders. No translation service is used. */
export function transformHtml(html, { locale = 'en', catalog = {}, collect, strict = true } = {}) {
  function translate(source) {
    const text = normalize(decodeHtml(source));
    if (!needsTranslation(text)) return source;
    const id = messageId(text);
    collect?.set(id, text);
    if (locale === 'en') return source;
    const translated = catalog[id];
    if (typeof translated !== 'string' || !translated.trim()) {
      if (strict) throw new Error('Missing ' + locale + ' message ' + id);
      return source;
    }
    const placeholders = value => [...value.matchAll(/\{\/?\d+\}/g)].map(m => m[0]).sort();
    if (JSON.stringify(placeholders(text)) !== JSON.stringify(placeholders(translated))) throw new Error('Markup placeholder mismatch ' + locale + ' ' + id);
    return translated;
  }
  function opening(node) {
    return node.open.replace(/(\s)([^\s=/>]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/g, (raw, space, key, equal, quoted) => {
      const value = node.attrs[key];
      if (textAttributes.has(key) || node.tag === 'meta' && key === 'content' && metadata.has(node.attrs.name || node.attrs.property)) return space + key + equal + '"' + escapeHtml(translate(value)) + '"';
      if (locale !== 'en' && key === 'href' && value?.startsWith('/') && !value.startsWith('//') && !node.attrs.hreflang && !node.attrs['data-language']) {
        const { basePath } = splitLocale(new URL(value, 'https://diskpress.app').pathname);
        if (allPaths.includes(basePath)) return space + key + equal + '"' + escapeHtml(localePath(locale, value)) + '"';
      }
      return raw;
    });
  }
  function render(node, skip = false) {
    if (node.tag === '#raw') return node.raw;
    if (node.tag === '#text') {
      if (skip || !needsTranslation(decodeHtml(node.raw))) return node.raw;
      const start = node.raw.match(/^\s*/)[0], end = node.raw.match(/\s*$/)[0];
      return start + escapeHtml(translate(node.raw)) + end;
    }
    if (node.tag === '#root') return node.children.map(child => render(child)).join('');
    if (skip || node.attrs.translate === 'no') return original(node);
    const open = opening(node);
    // Plain-language instructions can use a copyable block without becoming code.
    // Shell commands and all other pre/code contents remain byte-for-byte intact.
    if (node.tag === 'pre' && node.attrs['data-localize'] === 'prose') {
      const code = node.children.find(child => child.tag === 'code');
      if (!code || code.children.some(child => child.tag !== '#text')) throw new Error('Localized prose block must contain plain text');
      const text = code.children.map(child => child.raw).join('');
      const lines = text.split('\n').map(line => escapeHtml(translate(line))).join('\n');
      return open + opening(code) + lines + code.close + node.close;
    }
    if (untouched.has(node.tag)) return open + node.children.map(original).join('') + node.close;
    if (groups.has(node.tag) && node.children.length && node.children.every(isPhrasing)) {
      const placeholders = new Map();
      let count = 0;
      function phrase(child) {
        if (child.tag === '#text') return decodeHtml(child.raw);
        const n = ++count;
        if (untouched.has(child.tag) || child.tag === 'br' || child.attrs.translate === 'no') {
          placeholders.set('{' + n + '}', original(child));
          return '{' + n + '}';
        }
        placeholders.set('{' + n + '}', opening(child));
        placeholders.set('{/' + n + '}', child.close);
        return '{' + n + '}' + child.children.map(phrase).join('') + '{/' + n + '}';
      }
      const source = normalize(node.children.map(phrase).join(''));
      if (!needsTranslation(source)) return open + node.children.map(child => render(child)).join('') + node.close;
      const result = translate(source);
      if (locale === 'en') return open + node.children.map(original).join('') + node.close;
      const escaped = escapeHtml(result).replace(/\{\/?\d+\}/g, token => placeholders.get(token));
      return open + escaped + node.close;
    }
    return open + node.children.map(child => render(child)).join('') + node.close;
  }
  return render(parseHtml(html));
}
