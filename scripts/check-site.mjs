import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const routes = ['/', '/faq/', '/cli/', '/privacy-policy/', '/terms-of-service/'];
const documents = new Map();
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#38;', '&');
const appStore = 'https://apps.apple.com/app/apple-store/id6800504458?pt=127627850&ct=www&mt=8';
const developerProfile = 'https://reverseeverything.com/ighor/?utm_source=diskpress.app';
const developerBlog = 'https://reverseeverything.com/?utm_source=diskpress.app';
const iconAssets = new Set(['/favicon.ico', '/favicon.svg', '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png']);
let developerLinks = 0;

for (const route of [...routes, '/404.html']) {
  const file = route === '/404.html' ? '404.html' : `${route.slice(1)}index.html`;
  const html = await readFile(path.join(root, file), 'utf8');
  documents.set(route, html);
  assert.match(html, /<!doctype html>/i, `${route} needs a doctype`);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route} needs one main heading`);
  assert.match(html, /<title>[^<]+<\/title>/, `${route} needs a title`);
  assert.match(html, /<meta name="description" content="[^"]+"/, `${route} needs a description`);
  const iconLinks = [...html.matchAll(/<link\b[^>]*rel="(?:icon|apple-touch-icon)"[^>]*>/g)].map(match => match[0]);
  for (const icon of iconAssets) assert.ok(iconLinks.some(link => link.includes(`href="${icon}?v=2"`)), `${route} is missing a cache-versioned icon ${icon}`);
  if (route !== '/404.html') assert.ok(html.includes(`rel="canonical" href="https://diskpress.app${route}"`), `${route} has the wrong canonical URL`);
  assert.equal((html.match(/src="https:\/\/analytics\.diskpress\.app\/js\/script\.outbound-links\.tagged-events\.js"/g) || []).length, 1, `${route} must load Plausible once`);
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>')).replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  const css = [...head.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
  assert.ok(css.length > 1000 && css.includes('.site-header') && css.includes('.code-heading'), `${route} must inline the actual site CSS in the head`);
  assert.match(css, /font-family:-apple-system/, `${route} must use the local system font stack`);
  assert.ok(!/@font-face|@import|<link\b[^>]*rel="stylesheet"/.test(css + html), `${route} must not depend on a late stylesheet or font download`);
  assert.ok(!/<style\b/.test(html.slice(html.indexOf('<body>'))), `${route} must not introduce styles after the body starts`);
  const boot = [...head.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(match => match[2].includes('diskpress-appearance'));
  assert.ok(boot && !/\basync\b|\bdefer\b|\btype=/.test(boot[1]), `${route} must set the appearance synchronously before paint`);
  assert.ok(boot[2].includes('dataset.enhanced'), `${route} must initialize enhanced controls before paint`);
  assert.ok(!/<select\b[^>]*id="appearance"/.test(html), `${route} must use the site-styled appearance menu`);
  assert.match(html, /<button\b[^>]*id="appearance"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/, `${route} needs an accessible, initially closed appearance trigger`);
  assert.match(html, /<button\b[^>]*id="appearance"[^>]*>\s*<span>Appearance<\/span>/, `${route} must visibly identify the control as Appearance`);
  assert.match(html, /id="appearance-menu"[^>]*role="menu"[^>]*hidden/, `${route} must keep the appearance popup hidden before interaction`);
  assert.equal((html.match(/role="menuitemradio"/g) || []).length, 3, `${route} needs three appearance choices`);
  for (const value of ['system', 'light', 'dark']) assert.ok(html.includes(`data-appearance-choice="${value}"`), `${route} is missing the ${value} appearance choice`);
  assert.ok(css.includes('.appearance-menu') && css.includes('.appearance-trigger'), `${route} must inline the appearance menu styles before rendering`);
  assert.ok(boot[2].includes("addEventListener('diskpress:appearance-ready', syncAppearanceControl)"), `${route} must prepare synchronous appearance label restoration`);
  const appearanceLabelPosition = html.indexOf("document.dispatchEvent(new Event('diskpress:appearance-ready'))");
  assert.ok(appearanceLabelPosition >= 0 && appearanceLabelPosition < html.indexOf('</header>'), `${route} must restore the appearance label before the header is complete`);
  assert.ok(!/in development|\/Users\/ighor\/|localhost|127\.0\.0\.1/.test(html), `${route} contains pre-release or local-only content`);
  assert.ok(!/[\u00a0\u200b-\u200f\u2028\u2029\u2060\ufeff\u2018\u2019\u201c\u201d]/.test(html), `${route} contains unsupported quote or whitespace characters`);
  const nameLinks = [...html.matchAll(/<a\b[^>]*>Ighor July<\/a>/g)].map(match => match[0]);
  assert.ok(nameLinks.length >= 3, `${route} must link every footer mention of the developer`);
  assert.equal(nameLinks.length, (html.match(/Ighor July/g) || []).length, `${route} must link every developer-name mention`);
  for (const link of nameLinks) assert.equal(decode(link.match(/\bhref="([^"]+)"/)?.[1] || ''), developerProfile, `${route} must link the developer name to the supplied profile URL`);
  assert.ok(html.includes(`href="${developerBlog}">Reverse Everything blog</a>`), `${route} must preserve the separate blog link`);
  developerLinks += nameLinks.length;
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(match[0], /\balt="[^"]*"/, `${route} image needs alt text`);
    assert.match(match[0], /\bwidth="\d+"/, `${route} image needs reserved width`);
    assert.match(match[0], /\bheight="\d+"/, `${route} image needs reserved height`);
  }
  for (const match of html.matchAll(/<button\b[^>]*data-copy-target[^>]*>/g)) {
    assert.ok(!/\bhidden\b/.test(match[0]), `${route} must reserve its copy controls from the first render`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${route} has duplicate IDs`);
}

assert.match(documents.get('/faq/'), /id="ssd-wear"/, 'The FAQ must explain SSD writes and folder suitability');
for (const route of ['/', '/cli/']) {
  assert.ok(documents.get(route).includes('href="/faq/#ssd-wear"'), `${route} must link to the SSD-write guidance`);
  assert.match(documents.get(route), /disk writes/, `${route} must disclose optimization writes`);
}

const screenshotSpecs = [
  ['overview', 1622, 1472, [480, 768, 1024, 1440, 1622], 'eager'],
  ['one-time-review', 1280, 1224, [480, 768, 1024, 1280], 'lazy'],
  ['one-time-results', 1280, 1278, [480, 768, 1024, 1280], 'lazy'],
  ['locations', 1622, 1200, [480, 768, 1024, 1440, 1622], 'lazy'],
  ['exclusions', 1622, 1200, [480, 768, 1024, 1440, 1622], 'lazy'],
  ['menu-bar', 720, 1012, [360, 540, 720], 'lazy'],
];
const homepage = documents.get('/');
assert.match(homepage, /<h3>File compression<\/h3>/, 'The homepage must name the file compression feature explicitly');
assert.match(homepage, /<h3>File deduplication<\/h3>/, 'The homepage must name the file deduplication feature explicitly');
for (const route of ['/', '/faq/']) assert.ok(documents.get(route).includes('Does file deduplication delete my duplicate files?'), `${route} must distinguish file deduplication from duplicate deletion`);
const originalData = 2 * 100;
const compressedData = originalData * (1 - 30 / 100);
const sharedData = compressedData / 2;
const savedData = originalData - sharedData;
const savedPercent = savedData / originalData * 100;
const savingsExample = homepage.match(/<figure\b[^>]*id="combined-savings"[^>]*>[\s\S]*?<\/figure>/)?.[0];
assert.ok(savingsExample, 'The homepage must illustrate combined compression and deduplication savings');
assert.ok(savingsExample.includes('aria-labelledby="savings-example-heading"'), 'The savings illustration must have an accessible caption');
for (const [stage, megabytes] of [['original', originalData], ['compressed', compressedData], ['combined', sharedData]]) {
  const markup = savingsExample.match(new RegExp(`<li\\b[^>]*data-savings-stage="${stage}"[^>]*>([\\s\\S]*?)<\\/li>`))?.[1];
  assert.ok(markup?.includes(`>${megabytes} MB</strong>`), `The ${stage} stage must show the calculated storage total`);
  const barWidth = Number(markup.match(/style="width:\s*([\d.]+)%"/)?.[1]);
  assert.equal(barWidth, megabytes / originalData * 100, `The ${stage} bar must use the original storage as its common scale`);
}
assert.ok(savingsExample.includes(`${savedData} MB saved.`), 'The example must show the calculated space saved');
assert.ok(savingsExample.includes(`${savedPercent}% less storage.`), 'The example headline must use the original total as its denominator');
assert.ok(savingsExample.includes(`${savedData} MB out of ${originalData} MB = `), 'The example must explain its percentage calculation');
assert.ok(savingsExample.includes('not a benchmark or a guarantee'), 'The example must not promise the illustrated result');
assert.ok(savingsExample.includes('filesystem overhead') && savingsExample.includes('Snapshots'), 'The example must qualify physical storage and free-space estimates');
assert.ok(homepage.includes('href="/faq/#combined-savings"'), 'The example must link to the detailed savings explanation');
const savingsAnswer = documents.get('/faq/').match(/<details\b[^>]*id="combined-savings"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(savingsAnswer?.includes(`${savedData} MB out of the original ${originalData} MB, or ${savedPercent}%`), 'The FAQ must use the same correct savings calculation');
assert.ok(savingsAnswer.includes('do not already share storage') && savingsAnswer.includes('metadata and allocation overhead'), 'The FAQ must state the example assumptions');
assert.ok(homepage.includes(`href="${developerBlog}">Read Reverse Everything</a>`), 'The homepage blog link must keep its original destination');
const homepageImages = [...homepage.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
for (const [name, width, height, widths, loading] of screenshotSpecs) {
  const matches = homepageImages.filter(image => image.includes(`/_astro/diskpress-${name}.`));
  assert.equal(matches.length, 1, `The homepage must show the ${name} screenshot once`);
  const image = matches[0];
  const attribute = name => image.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  assert.equal(Number(attribute('width')), width, `${name} must reserve its original width`);
  assert.equal(Number(attribute('height')), height, `${name} must reserve its original height`);
  assert.equal(attribute('loading'), loading, `${name} has the wrong loading priority`);
  assert.ok(attribute('alt')?.length > 20, `${name} needs descriptive alt text`);
  assert.ok(attribute('sizes')?.includes('max-width'), `${name} needs responsive display sizes`);
  const variants = (attribute('srcset') || '').split(',').map(candidate => candidate.trim().split(/\s+/));
  assert.deepEqual(variants.map(([, descriptor]) => Number.parseInt(descriptor)), widths, `${name} needs the expected responsive widths`);
  assert.ok(variants.every(([url, descriptor]) => url.endsWith('.webp') && /^\d+w$/.test(descriptor) && Number.parseInt(descriptor) <= width), `${name} must use WebP without upscaling`);
  if (loading === 'eager') assert.equal(attribute('fetchpriority'), 'high', 'The hero screenshot must have high fetch priority');
}
assert.ok(homepage.includes('App screenshots use example data.'), 'Screenshot savings must be identified as example data');

let internalLinks = 0;
let appStoreLinks = 0;
let assets = 0;
for (const [route, html] of documents) {
  for (const match of html.matchAll(/\bhref="([^"]+)"/g)) {
    const href = decode(match[1]);
    if (href.includes('apps.apple.com')) {
      assert.equal(href, appStore, `${route} must preserve the supplied download URL`);
      appStoreLinks++;
    }
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    const destination = new URL(href, `https://diskpress.app${route}`);
    if (iconAssets.has(destination.pathname)) {
      assert.ok((await stat(path.join(root, destination.pathname))).size > 0, `${route} is missing an icon`);
      assets++;
      continue;
    }
    const document = documents.get(destination.pathname);
    assert.ok(document, `${route} links to a missing page ${href}`);
    if (destination.hash) {
      assert.ok(document.includes(`id="${decodeURIComponent(destination.hash.slice(1))}"`), `${route} links to a missing anchor ${href}`);
    }
    internalLinks++;
  }
  const sources = [...html.matchAll(/\bsrc="(\/[^"?]+)"/g)].map(match => decode(match[1]));
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    sources.push(...decode(match[1]).split(',').map(candidate => candidate.trim().split(/\s+/)[0]));
  }
  for (const source of sources) {
    assert.ok((await stat(path.join(root, source))).size > 0, `${route} is missing asset ${source}`);
    assets++;
  }
}

const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');
for (const [filename, size] of [['favicon-16x16.png', 16], ['favicon-32x32.png', 32], ['apple-touch-icon.png', 180]]) {
  const png = await readFile(path.join(root, filename));
  assert.ok(png.subarray(0, 8).equals(pngSignature), `${filename} must be a PNG`);
  assert.equal(png.readUInt32BE(16), size, `${filename} has the wrong width`);
  assert.equal(png.readUInt32BE(20), size, `${filename} has the wrong height`);
}
const ico = await readFile(path.join(root, 'favicon.ico'));
assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1, 'The favicon must be an ICO, not a renamed image');
assert.equal(ico.readUInt16LE(4), 4);
for (const [index, size] of [16, 32, 48, 64].entries()) {
  const entry = 6 + index * 16;
  assert.equal(ico[entry], size);
  assert.equal(ico[entry + 1], size);
  const length = ico.readUInt32LE(entry + 8);
  const offset = ico.readUInt32LE(entry + 12);
  assert.ok(offset >= 70 && offset + length <= ico.length, 'ICO image data must be complete');
  assert.ok(ico.subarray(offset, offset + 8).equals(pngSignature), 'ICO frames must contain valid PNG payloads');
  assert.equal(ico.readUInt32BE(offset + 16), size, 'ICO payload width must match its directory entry');
  assert.equal(ico.readUInt32BE(offset + 20), size, 'ICO payload height must match its directory entry');
}
for (const route of routes) assert.ok(sitemap.includes(`<loc>https://diskpress.app${route}</loc>`));
assert.ok((await readFile(path.join(root, 'robots.txt'), 'utf8')).includes('Sitemap: https://diskpress.app/sitemap.xml'));
assert.match(documents.get('/404.html'), /noindex, follow/);
assert.ok(appStoreLinks >= 7);
console.log(`Verified ${documents.size} pages, ${internalLinks} internal links, ${appStoreLinks} App Store links, ${developerLinks} developer profile links, ${assets} asset references, metadata, sitemap, analytics, and first-paint styling.`);
