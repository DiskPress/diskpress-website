// Structural and behavioral tests only. No translation service or native addon.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { allPaths, detectLocale, localeCodes, localePath, locales, splitLocale, translatedLocales } from '../src/i18n/routes.mjs';
import { languageScript } from '../src/i18n/browser.mjs';
import { messageId, parseHtml, transformHtml } from '../src/i18n/html.mjs';
import { writeLocalizedNotFound } from '../src/i18n/build.mjs';
import catalogs from '../src/i18n/catalogs.mjs';

const cases = [
  [['en-US', 'de'], 'en'], [['de-AT'], 'de'], [['uk-UA'], 'uk'],
  [['zh-CN'], 'zh-hans'], [['zh-SG'], 'zh-hans'], [['zh-TW'], 'zh-hant'],
  [['zh-HK'], 'zh-hant'], [['zh-MO'], 'zh-hant'], [['zh-Hans-HK'], 'zh-hans'],
  [['zh-Hant-CN'], 'zh-hant'], [['es-MX'], 'es-mx'], [['es-419'], 'es-mx'],
  [['es-AR'], 'es-mx'], [['es-US'], 'es-mx'], [['es-ES'], 'es-es'],
  [['es'], 'es-es'], [['fr', 'uk'], 'uk'], [['fr'], 'en'], [[], 'en'],
];
for (const [input, expected] of cases) assert.equal(detectLocale(input), expected);
for (const locale of localeCodes) for (const route of allPaths) {
  assert.deepEqual(splitLocale(localePath(locale, route)), { locale, basePath: route });
}
assert.equal(localePath('uk', '/de/faq/?from=test#safety'), '/uk/faq/?from=test#safety');
assert.throws(() => localePath('fr', '/'), /Unsupported locale/);

function bootstrap({ pathname = '/faq/', search = '?from=test', hash = '#safety', languages = ['de'], storage = new Map(), blocked = false } = {}) {
  const redirects = [], listeners = {};
  class Element { closest() { return null; } }
  const location = { pathname, search, hash, replace: value => redirects.push(value) };
  vm.runInNewContext(languageScript, {
    URL, Element, location, navigator: { languages, language: languages[0] },
    localStorage: {
      getItem(key) { if (blocked) throw new Error('unavailable'); return storage.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw new Error('unavailable'); storage.set(key, value); },
    },
    document: { addEventListener: (name, fn) => { listeners[name] = fn; }, querySelector: () => null },
  });
  return { redirects, storage, listeners, Element };
}
const first = bootstrap();
for (const [languages, expected] of cases) {
  assert.deepEqual(bootstrap({ languages }).redirects, expected === 'en' ? [] : [`/${expected}/faq/?from=test#safety`]);
}
assert.deepEqual(first.redirects, ['/de/faq/?from=test#safety']);
assert.equal(first.storage.get('diskpress-language'), 'de');
assert.equal(first.storage.get('diskpress-language-visited'), '1');
assert.deepEqual(bootstrap({ storage: first.storage, languages: ['uk'] }).redirects, []);
assert.deepEqual(bootstrap({ blocked: true }).redirects, []);
assert.deepEqual(bootstrap({ languages: ['en-US'] }).redirects, []);
assert.deepEqual(bootstrap({ pathname: '/uk/faq/' }).redirects, []);
assert.equal(bootstrap({ pathname: '/uk/faq/' }).storage.get('diskpress-language'), 'uk');
assert.deepEqual(bootstrap({ pathname: '/missing/' }).redirects, ['/de/missing/?from=test#safety']);
const manual = bootstrap({ languages: ['en'] });
const link = { dataset: { language: 'es-mx' }, href: '/es-mx/faq/' };
const target = new manual.Element();
target.closest = selector => selector === 'a[data-language]' ? link : null;
manual.listeners.click({ target });
assert.equal(link.href, '/es-mx/faq/?from=test#safety');
assert.equal(manual.storage.get('diskpress-language'), 'es-mx');

const sample = '<!doctype html><html><head><title>Test heading</title><script>const x = "English code";</script><style>p{color:red}</style></head><body><p>Hello <a href="/faq/#test">world</a>.</p><pre><code>command --help</code></pre><p><a href="https://example.com/">External</a></p></body></html>';
const dictionary = {
  [messageId('Test heading')]: 'TEST-HEADING',
  [messageId('Hello {1}world{/1}.')]: '{1}TEST{/1}.',
  [messageId('{1}External{/1}')]: '{1}EXTERNAL{/1}',
};
const rendered = transformHtml(sample, { locale: 'de', catalog: dictionary });
parseHtml(rendered);
assert.ok(rendered.includes('href="/de/faq/#test"'));
assert.ok(rendered.includes('href="https://example.com/"'));
assert.ok(rendered.includes('<code>command --help</code>'));
assert.ok(rendered.includes('const x = "English code";'));
assert.throws(() => transformHtml('<p>Uncatalogued text</p>', { locale: 'de' }), /Missing de message/);
assert.throws(() => transformHtml('<p>Hello <a href="/faq/">world</a>.</p>', { locale: 'de', catalog: { [messageId('Hello {1}world{/1}.')]: 'BROKEN' } }), /placeholder mismatch/);
assert.throws(() => parseHtml('<p><span></p>'), /Unbalanced/);
assert.equal(messageId('{1}Label{/1}{2}'), messageId('{1}Label{/1} \n {2}'));
assert.notEqual(messageId('Two words'), messageId('Twowords'));
const inlineMarkup = '<button><svg></svg> <span>Label</span></button>';
const inlineCatalog = { [messageId('{1}{2}Label{/2}')]: '{1}{2}TEST{/2}' };
assert.equal(transformHtml(inlineMarkup, { locale: 'de', catalog: inlineCatalog }), '<button><svg></svg><span>TEST</span></button>');
const prose = '<pre data-localize="prose"><code>First line\nSecond line</code></pre>';
assert.ok(transformHtml(prose, { locale: 'de', catalog: { [messageId('First line')]: 'LINE-1', [messageId('Second line')]: 'LINE-2' } }).includes('LINE-1\nLINE-2'));
assert.equal(new Set(translatedLocales.map(locale => Object.keys(catalogs[locale]).length)).size, 1);
for (const locale of translatedLocales) for (const value of Object.values(catalogs[locale])) assert.ok(typeof value === 'string' && value.trim());

const temporary = await mkdtemp(join(tmpdir(), 'diskpress-i18n-test-'));
try {
  for (const locale of translatedLocales) {
    const folder = join(temporary, locale, '404');
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'index.html'), `<html lang="${locales[locale].lang}"><meta name="robots" content="noindex, follow"></html>`);
  }
  await writeLocalizedNotFound(pathToFileURL(temporary + '/'));
  for (const locale of translatedLocales) assert.equal(await readFile(join(temporary, locale, '404.html'), 'utf8'), await readFile(join(temporary, locale, '404/index.html'), 'utf8'));
} finally {
  await rm(temporary, { recursive: true });
}
console.log(`Verified language matching, one-time redirects, explicit choices, storage failures, markup safety, ${localeCodes.length} route variants, and localized 404 generation.`);
