import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const routes = ['/', '/faq/', '/cli/', '/privacy-policy/', '/terms-of-service/'];
const unlistedRoutes = ['/application-corrupted/'];
const noindexRoutes = new Set([...unlistedRoutes, '/404.html']);
const documents = new Map();
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#38;', '&');
const appStore = 'https://apps.apple.com/app/apple-store/id6800504458?pt=127627850&ct=www&mt=8';
const developerProfile = 'https://reverseeverything.com/ighor/?utm_source=diskpress.app';
const developerBlog = 'https://reverseeverything.com/?utm_source=diskpress.app';
const iconAssets = new Set(['/favicon.ico', '/favicon.svg', '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png']);
let developerLinks = 0;

for (const route of [...routes, ...unlistedRoutes, '/404.html']) {
  const file = route === '/404.html' ? '404.html' : `${route.slice(1)}index.html`;
  const html = await readFile(path.join(root, file), 'utf8');
  documents.set(route, html);
  assert.match(html, /<!doctype html>/i, `${route} needs a doctype`);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route} needs one main heading`);
  assert.match(html, /<title>[^<]+<\/title>/, `${route} needs a title`);
  assert.match(html, /<meta name="description" content="[^"]+"/, `${route} needs a description`);
  const iconLinks = [...html.matchAll(/<link\b[^>]*rel="(?:icon|apple-touch-icon)"[^>]*>/g)].map(match => match[0]);
  for (const icon of iconAssets) assert.ok(iconLinks.some(link => link.includes(`href="${icon}?v=2"`)), `${route} is missing a cache-versioned icon ${icon}`);
  if (noindexRoutes.has(route)) {
    assert.match(html, /<meta name="robots" content="noindex, follow"/, `${route} must exclude itself from search indexing`);
    assert.ok(!html.includes('rel="canonical"'), `${route} must not advertise an indexable canonical URL`);
  } else {
    assert.ok(html.includes(`rel="canonical" href="https://diskpress.app${route}"`), `${route} has the wrong canonical URL`);
    assert.ok(!/<meta name="robots"[^>]*noindex/.test(html), `${route} must remain indexable`);
  }
  assert.equal((html.match(/src="https:\/\/analytics\.diskpress\.app\/js\/script\.outbound-links\.tagged-events\.js"/g) || []).length, 1, `${route} must load Plausible once`);
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>')).replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  const css = [...head.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
  assert.ok(css.length > 1000 && css.includes('.site-header') && css.includes('.code-heading'), `${route} must inline the actual site CSS in the head`);
  assert.match(css, /font-family:-apple-system/, `${route} must use the local system font stack`);
  if (html.includes('class="document-grid wrap"')) {
    const gridRules = [...css.matchAll(/\.document-grid\{([^{}]*)\}/g)].map(match => match[1]);
    const columns = gridRules.map(rule => rule.match(/(?:^|;)grid-template-columns:([^;]+)/)?.[1]).filter(Boolean);
    assert.deepEqual(columns, ['210px minmax(0,1fr)', '180px minmax(0,1fr)', '1fr'], `${route} must give the article the remaining width and stack navigation on small screens`);
    const gaps = gridRules.map(rule => rule.match(/(?:^|;)gap:([^;]+)/)?.[1]?.replace(/\s+/g, '')).filter(Boolean);
    assert.deepEqual(gaps, ['min(32px,var(--gutter))'], `${route} must use one compact document gap that never exceeds the page inset`);
    assert.ok(gridRules.every(rule => !/justify-content:space-(?:between|around|evenly)/.test(rule)), `${route} must not push the article away from its navigation`);
  }
  if (route === '/') {
    assert.ok(css.includes('--screenshot-caption-gap:20px'), 'Screenshot captions must share a 20 pixel gap');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    for (const selector of ['.hero-visual', '.menu-visual', '.screenshot-figure']) {
      const declarations = rules.filter(([, selectors]) => selectors.split(',').some(value => value.trim() === selector)).map(([, , body]) => body);
      assert.ok(declarations.some(body => /(?:^|;)display:(?:grid|flex)(?:;|$)/.test(body)), `${selector} must use a layout that applies caption gaps`);
      assert.ok(declarations.some(body => body.includes('gap:var(--screenshot-caption-gap)')), `${selector} must use the shared caption spacing`);
      for (const body of declarations) {
        const gap = body.match(/(?:^|;)gap:([^;]+)/)?.[1];
        if (gap) assert.equal(gap, 'var(--screenshot-caption-gap)', `${selector} must preserve caption spacing at every breakpoint`);
        const padding = body.match(/(?:^|;)padding:([^;]+)/)?.[1];
        if (padding) assert.ok(padding.split(/\s+/).every(value => /^\d+px$/.test(value) && Number.parseInt(value) >= 20), `${selector} must keep its caption gap within the outer inset`);
      }
    }
    assert.match(css, /\.screenshot-disclaimer\{[^}]*margin-top:var\(--screenshot-caption-gap\)/, 'Screenshot group descriptions must retain the same separation');
  }
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
    assert.match(match[0], /\balt(?:="[^"]*"|(?=\s|>))/, `${route} image needs an alt attribute`);
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

for (const route of ['/', '/faq/']) {
  const answer = documents.get(route).match(/<details\b[^>]*id="offline"[^>]*>[\s\S]*?<\/details>/)?.[0];
  assert.ok(answer?.includes('does not upload your files, filenames, or optimization results'), `${route} must explain that user data stays local`);
  assert.ok(answer.includes('File optimization works offline') && answer.includes('Normal optimization activity is not reported'), `${route} must distinguish local optimization from diagnostic visits`);
  assert.ok(answer.includes('application integrity check fails') && answer.includes('automatically opens a diagnostic webpage with a numeric check identifier'), `${route} must disclose automatic integrity-diagnostic visits`);
  assert.ok(answer.includes('cookie-free Plausible analytics') && answer.includes('count these visits by failure code'), `${route} must explain website analytics for diagnostic visits`);
  assert.ok(answer.includes('href="/privacy-policy/#application"'), `${route} must link to the detailed application privacy explanation`);
}
const privacyPolicy = documents.get('/privacy-policy/');
assert.ok(privacyPolicy.includes('Application integrity diagnostics') && privacyPolicy.includes('numeric <code>utm_source</code> value identifying the failed check'), 'The privacy policy must explain the diagnostic campaign value');
assert.ok(privacyPolicy.includes('also applies when the app is serving a CLI command') && privacyPolicy.includes('no filenames, local paths, optimization results, or per-user identifier'), 'The privacy policy must explain CLI diagnostics and their limited URL contents');
assert.ok(privacyPolicy.includes('Normal use and errors optimizing individual files do not trigger this visit'), 'The privacy policy must distinguish integrity failures from routine optimization errors');
assert.ok(documents.get('/terms-of-service/').includes('A failed application integrity check automatically opens a diagnostic webpage with a numeric check identifier'), 'The terms must preserve the diagnostic-visit disclosure');
for (const [route, html] of documents) assert.ok(!/No app analytics or telemetry|No uploads, analytics, or telemetry|contains no analytics or telemetry|has no account, analytics, telemetry|does not include analytics or telemetry|DiskPress stays offline/.test(html), `${route} must not contradict the diagnostic-visit disclosure`);

const integrityPage = documents.get('/application-corrupted/');
assert.match(integrityPage, /<h1>Application integrity warning<\/h1>/, 'The unlisted help page needs a clear DiskPress warning heading');
assert.ok(integrityPage.includes('data-domain="diskpress.app"') && integrityPage.includes('plausible.init();'), 'The unlisted help page must retain normal Plausible page-view tracking');
assert.ok(integrityPage.includes('Move only the installed DiskPress.app application to the Trash.'), 'Recovery guidance must limit removal to the application bundle');
assert.ok(integrityPage.includes('Do not delete your personal files, DiskPress settings, or recovery records'), 'Recovery guidance must preserve user data and unfinished recovery material');
assert.ok(integrityPage.includes('Do not bypass the warning or disable macOS security protections.'), 'The help page must not recommend bypassing integrity protections');
assert.ok(integrityPage.includes('mailto:support@apptrust.app?subject=DiskPress%20application%20integrity%20warning'), 'The help page must provide the DiskPress support address and a useful subject');
assert.ok(integrityPage.includes('.document-content a:not(.download-link)'), 'Document links must not override download-button contrast');
assert.ok(!/Parall|support@parall\.app/.test(integrityPage), 'The help page must not inherit another application\'s support details or bug claims');
for (const [route, html] of documents) {
  if (!unlistedRoutes.includes(route)) {
    for (const unlistedRoute of unlistedRoutes) assert.ok(!html.includes(unlistedRoute.slice(1, -1)), `${route} must not expose the direct-only help page, even as plain text`);
  }
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
const backgroundSection = homepage.match(/<section\b[^>]*id="background"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert.ok(backgroundSection?.includes('first optimization pass can keep the CPU busy'), 'The homepage must explain the initial compression workload');
assert.ok(backgroundSection.includes('not yet compressed') && backgroundSection.includes('new or modified files'), 'The homepage must distinguish existing uncompressed files from ongoing changes');
assert.ok(backgroundSection.includes('routine CPU use is usually much lower'), 'The homepage must describe lighter ongoing CPU usage without guaranteeing it');
assert.ok(backgroundSection.includes('Periodic scans and new work still use CPU'), 'The homepage must disclose ongoing monitoring overhead');
assert.ok(backgroundSection.includes('href="/faq/#performance"'), 'The homepage must link to the detailed CPU-use explanation');
const performanceAnswer = documents.get('/faq/').match(/<details\b[^>]*id="performance"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(performanceAnswer?.includes('unchanged files that are already compressed do not need to be compressed again'), 'The FAQ must explain why ongoing compression work is lighter');
assert.ok(performanceAnswer.includes('eligible new or modified files') && performanceAnswer.includes('between scans and optimization jobs'), 'The FAQ must qualify when CPU use is low and which files need new compression work');
assert.ok(performanceAnswer.includes('does not mean zero overhead') && performanceAnswer.includes('another busy first pass'), 'The FAQ must qualify monitoring overhead and newly optimized locations');
assert.ok(performanceAnswer.includes('Low CPU') && performanceAnswer.includes('pause on battery'), 'The FAQ must preserve performance and battery controls');
assert.ok(homepage.includes('Adding a location does not immediately optimize it.'), 'The homepage must not imply adding a location starts its first optimization pass');
const companionLink = homepage.match(/<a\b[^>]*class="text-link companion-app-link"[^>]*>[\s\S]*?<\/a>/)?.[0];
assert.ok(companionLink?.includes('href="https://apparchiver.com/?utm_source=diskpress.app"'), 'The companion icon must keep the supplied App Archiver destination');
assert.ok(companionLink.includes('<span>Discover App Archiver</span>'), 'The companion icon must have an accompanying text label');
const companionIcon = companionLink.match(/<img\b[^>]*>/)?.[0];
assert.ok(companionIcon?.includes('/_astro/app-archiver-icon.'), 'The companion link must use the supplied App Archiver artwork');
assert.match(companionIcon, /\balt(?:=""|(?=\s|>))/, 'The decorative companion icon must not repeat its link label');
for (const attribute of ['width="56"', 'height="56"', 'sizes="56px"', 'loading="lazy"']) assert.ok(companionIcon.includes(attribute), `The companion icon needs ${attribute}`);
const companionVariants = companionIcon.match(/\bsrcset="([^"]+)"/)?.[1].split(',').map(candidate => candidate.trim().split(/\s+/));
assert.deepEqual(companionVariants?.map(([, descriptor]) => descriptor), ['56w', '112w', '168w'], 'The companion icon needs standard, 2x, and 3x display sizes');
for (const [url] of companionVariants) {
  assert.ok(url.startsWith('/_astro/app-archiver-icon.') && url.endsWith('.webp'), 'The companion icon must use local optimized WebP variants');
  const icon = await readFile(path.join(root, url));
  assert.ok(icon.length < 24 * 1024, 'Each companion icon variant must remain lightweight');
  assert.equal(icon.toString('ascii', 0, 4), 'RIFF');
  assert.equal(icon.toString('ascii', 8, 12), 'WEBP');
}
assert.match(homepage, /<h2>Two techniques\.<br\s*\/?>Working together\.<\/h2>/, 'The homepage must present compression and deduplication as a combined workflow');
assert.ok(homepage.includes('combines file compression and file deduplication in one optimization workflow'), 'The feature introduction must explain that both techniques work together');
for (const [route, html] of documents) assert.ok(!/Two ways to save|Nothing new to open/.test(html), `${route} must not present the techniques as alternative choices`);
assert.ok(documents.get('/faq/').includes('both techniques together in one optimization workflow'), 'The FAQ must explain the combined optimization workflow');
assert.ok(documents.get('/cli/').includes('combine file compression with file deduplication'), 'The CLI guide must explain the combined optimization workflow');
assert.ok(documents.get('/cli/').includes('Deduplication must be enabled.'), 'The CLI guide must preserve its configuration requirement');
assert.match(homepage, /<h3>File compression<\/h3>/, 'The homepage must name the file compression feature explicitly');
assert.match(homepage, /<h3>File deduplication<\/h3>/, 'The homepage must name the file deduplication feature explicitly');
const deduplicationFeature = [...homepage.matchAll(/<article\b[^>]*class="native-feature"[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]).find(article => article.includes('<h3>File deduplication</h3>'));
assert.ok(deduplicationFeature?.includes('DiskPress is not a duplicate file remover.'), 'The feature description must distinguish file deduplication from duplicate deletion');
assert.ok(deduplicationFeature.includes('APFS copy-on-write clones') && deduplicationFeature.includes('Both files keep their paths.'), 'The feature description must explain storage sharing without removing file paths');
for (const route of ['/', '/faq/']) {
  const answer = documents.get(route).match(/<details\b[^>]*id="deduplication"[^>]*>[\s\S]*?<\/details>/)?.[0];
  assert.ok(answer?.includes('Is DiskPress a duplicate file remover?') && answer.includes('No. DiskPress is not a duplicate file remover.'), `${route} must explicitly answer the duplicate-remover question`);
  assert.ok(answer.includes('Both files stay available at their existing paths.') && answer.includes('After verifying identical contents'), `${route} must explain verified replacement without losing either file`);
  assert.ok(answer.includes('APFS (Apple File System) copy-on-write clone') && answer.includes('same physical data blocks'), `${route} must explain APFS clone storage sharing`);
  assert.ok(answer.includes('Metadata still takes some space') && answer.includes('later edits can use more space'), `${route} must not promise zero storage overhead`);
  assert.ok(answer.includes('edit or delete either file without changing the other') && answer.includes('same APFS volume'), `${route} must preserve file independence and the same-volume requirement`);
  assert.ok(answer.includes('href="https://developer.apple.com/documentation/foundation/about-apple-file-system"'), `${route} must link the APFS explanation to Apple documentation`);
}
const originalData = 2 * 100;
const compressedData = originalData * (1 - 30 / 100);
const sharedData = compressedData / 2;
const savedData = originalData - sharedData;
const savedPercent = savedData / originalData * 100;
const savingsExample = homepage.match(/<figure\b[^>]*id="combined-savings"[^>]*>[\s\S]*?<\/figure>/)?.[0];
assert.ok(savingsExample, 'The homepage must illustrate combined compression and deduplication savings');
assert.ok(savingsExample.includes('aria-labelledby="savings-example-heading"'), 'The savings illustration must have an accessible caption');
assert.ok(savingsExample.includes('After compression') && savingsExample.includes('After both techniques'), 'The example must show savings building together rather than selectable modes');
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
assert.equal((sitemap.match(/<loc>/g) || []).length, routes.length, 'The sitemap must contain only the indexable public pages');
const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Sitemap: https://diskpress.app/sitemap.xml'));
assert.match(robots, /^Allow: \/$/m, 'Crawlers must be allowed to read the noindex page');
for (const route of unlistedRoutes) {
  assert.ok(!sitemap.includes(route.slice(0, -1)), 'The direct-only help page must stay out of the sitemap');
  assert.ok(!robots.includes(route.slice(0, -1)), 'robots.txt must not advertise or block the direct-only help URL');
}
const headers = await readFile(path.join(root, '_headers'), 'utf8');
const noindexHeaderPaths = headers.trim().split(/\n\s*\n/).filter(block => /X-Robots-Tag:[^\n]*\bnoindex\b/i.test(block)).map(block => block.split('\n')[0]);
assert.deepEqual(noindexHeaderPaths, ['/application-corrupted', '/application-corrupted/*'], 'Cloudflare must send noindex headers only for the integrity-help route and its URL variants');
assert.match(documents.get('/404.html'), /noindex, follow/);
assert.ok(appStoreLinks >= 7);
console.log(`Verified ${documents.size} pages, ${internalLinks} internal links, ${appStoreLinks} App Store links, ${developerLinks} developer profile links, ${assets} asset references, metadata, sitemap, analytics, and first-paint styling.`);
