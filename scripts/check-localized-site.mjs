import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { allPaths, localeCodes, localePath, locales, publicPaths, splitLocale, translatedLocales } from '../src/i18n/routes.mjs';
import { decodeHtml, parseHtml } from '../src/i18n/html.mjs';

export async function readLocalizedPages(directory) {
  const pages = new Map();
  for (const locale of translatedLocales) for (const route of allPaths) {
    const pathname = localePath(locale, route);
    const html = await readFile(path.join(directory, pathname, 'index.html'), 'utf8');
    pages.set(pathname, html);
    parseHtml(html);
    assert.match(html, new RegExp(`<html\\b[^>]*lang="${locales[locale].lang}"`), pathname + ' language');
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, pathname + ' main heading');
    const head = html.slice(0, html.indexOf('</head>'));
    assert.ok(head.includes('<style'), pathname + ' pre-paint CSS');
    assert.ok(head.includes('diskpress-language-visited'), pathname + ' language bootstrap');
    assert.equal((html.match(/data-language="/g) || []).length, localeCodes.length, pathname + ' language choices');
    if (publicPaths.includes(route)) {
      assert.ok(head.includes(`rel="canonical" href="https://diskpress.app${pathname}"`), pathname + ' canonical');
      for (const other of localeCodes) assert.ok(head.includes(`hreflang="${locales[other].lang}" href="https://diskpress.app${localePath(other, route)}"`), pathname + ' alternate ' + other);
      assert.ok(head.includes('hreflang="x-default"'), pathname + ' default language');
      assert.ok(!html.includes('/application-corrupted/'), pathname + ' no hidden help navigation');
    } else {
      assert.ok(head.includes('content="noindex, follow"'), pathname + ' noindex');
      assert.ok(!head.includes('rel="canonical"'), pathname + ' no indexable canonical');
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, pathname + ' unique IDs');
    for (const [tag, value] of [...html.matchAll(/<a\b[^>]*href="([^"#][^"]*)"[^>]*>/g)].map(match => [match[0], decodeHtml(match[1])])) {
      if (!value.startsWith('/') || tag.includes('data-language=')) continue;
      const target = new URL(value, 'https://diskpress.app');
      const targetRoute = splitLocale(target.pathname);
      if (allPaths.includes(targetRoute.basePath)) assert.equal(targetRoute.locale, locale, pathname + ' internal language ' + value);
    }
  }
  for (const locale of translatedLocales) {
    assert.equal(await readFile(path.join(directory, locale, '404.html'), 'utf8'), pages.get(`/${locale}/404/`), locale + ' Cloudflare 404 fallback');
  }
  return pages;
}
