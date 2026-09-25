import assert from 'node:assert/strict';
import {readFile,
        stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const routes = [ '/', '/faq/', '/cli/', '/changelog/', '/support/', '/privacy-policy/', '/terms-of-service/' ];
const unlistedRoutes = [ '/application-corrupted/' ];
const noindexRoutes = new Set([...unlistedRoutes, '/404.html' ]);
const documents = new Map();
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#38;', '&');
const appStore = 'https://apps.apple.com/app/apple-store/id6800504458?pt=127627850&ct=diskpress.app&mt=8';
const appBundle = 'https://apps.apple.com/app-bundle/apple-store/id6811364083?pt=127627850&ct=diskpress.app&mt=8';
const siteConfig = await readFile(new URL('../src/consts.ts', import.meta.url), 'utf8');
const availabilitySetting = siteConfig.match(/export const APP_STORE_AVAILABLE = (true|false);/);
assert.ok(availabilitySetting, 'Availability must be an explicit shared build-time setting');
const appStoreAvailable = availabilitySetting[1] === 'true';
assert.equal(siteConfig.match(/export const APP_STORE_URL = '([^']+)';/)?.[1], appStore, 'Keep the supplied App Store URL intact for release');
assert.equal(siteConfig.match(/export const STORAGE_SAVER_DUO_URL = '([^']+)';/)?.[1], appBundle, 'Keep the supplied bundle URL and its campaign parameters intact');
const developerProfile = 'https://reverseeverything.com/ighor/?utm_source=diskpress.app';
const developerBlog = 'https://reverseeverything.com/?utm_source=diskpress.app';
const iconAssets = new Set([ '/favicon.ico', '/favicon.svg', '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png' ]);
const socialImage = 'https://diskpress.app/og.png?v=1';
const socialImageAlt = 'DiskPress. More room. Same files. Native file compression and deduplication, with green layered artwork on a dark background.';
let developerLinks = 0;

for (const route of [...routes, ...unlistedRoutes, '/404.html'])
{
    const file = route === '/404.html' ? '404.html' : `${route.slice(1)}index.html`;
    const html = await readFile(path.join(root, file), 'utf8');
    documents.set(route, html);
    assert.match(html, /<!doctype html>/i, `${route} needs a doctype`);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route} needs one main heading`);
    assert.match(html, /<title>[^<]+<\/title>/, `${route} needs a title`);
    assert.match(html, /<meta name="description" content="[^"]+"/, `${route} needs a description`);
    const helpNavigation = html.match(/<nav\b[^>]*aria-label="Help and legal"[^>]*>[\s\S]*?<\/nav>/)?.[0];
    const mobileNavigation = html.match(/<nav\b[^>]*aria-label="Mobile navigation"[^>]*>[\s\S]*?<\/nav>/)?.[0];
    const productNavigation = html.match(/<nav\b[^>]*aria-label="Product links"[^>]*>[\s\S]*?<\/nav>/)?.[0];
    for (const navigation of [mobileNavigation, productNavigation])
        assert.ok(navigation?.includes('href="/faq/#download-price">Availability</a>'), `${route} must make release information easy to find`);
    assert.ok(productNavigation?.includes('href="/changelog/">Changelog</a>') && mobileNavigation?.includes('href="/changelog/">Changelog</a>'), `${route} must make the changelog easy to find`);
    assert.match(helpNavigation || '', /<a href="\/support\/"[^>]*>Contact support<\/a>/, `${route} must route footer support through the dedicated page`);
    assert.match(mobileNavigation || '', /<a href="\/support\/"[^>]*>Support<\/a>/, `${route} must route mobile support through the dedicated page`);
    const iconLinks = [...html.matchAll(/<link\b[^>]*rel="(?:icon|apple-touch-icon)"[^>]*>/g) ].map(match => match[0]);
    for (const icon of iconAssets)
        assert.ok(iconLinks.some(link => link.includes(`href="${icon}?v=2"`)), `${route} is missing a cache-versioned icon ${icon}`);
    if (noindexRoutes.has(route))
    {
        assert.match(html, /<meta name="robots" content="noindex, follow"/, `${route} must exclude itself from search indexing`);
        assert.ok(!html.includes('rel="canonical"'), `${route} must not advertise an indexable canonical URL`);
    }
    else
    {
        assert.ok(html.includes(`rel="canonical" href="https://diskpress.app${route}"`), `${route} has the wrong canonical URL`);
        assert.ok(!/<meta name="robots"[^>]*noindex/.test(html), `${route} must remain indexable`);
    }
    assert.equal((html.match(/src="https:\/\/analytics\.diskpress\.app\/js\/script\.outbound-links\.tagged-events\.js"/g) || []).length, 1, `${route} must load Plausible once`);
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>')).replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
    const metaTags = [...head.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"\s*\/?\s*>/g) ];
    const meta = new Map(metaTags.map(([, name, value ]) => [name, value]));
    const pageTitle = head.match(/<title>([^<]+)<\/title>/)?.[1];
    for (const name of ['og:title', 'twitter:title'])
        assert.equal(meta.get(name), pageTitle, `${route} must preserve its own title in social previews`);
    for (const name of ['og:description', 'twitter:description'])
        assert.equal(meta.get(name), meta.get('description'), `${route} must preserve its own description in social previews`);
    // Astro renders the 404 file from its logical /404/ route, which remains noindex.
    const socialPageRoute = route === '/404.html' ? '/404/' : route;
    assert.equal(meta.get('og:url'), `https://diskpress.app${socialPageRoute}`, `${route} must use its trusted public URL in social previews`);
    assert.equal(meta.get('twitter:card'), 'summary_large_image', `${route} must request a widescreen social card`);
    for (const name of ['og:image', 'twitter:image'])
    {
        assert.equal(metaTags.filter(([, key ]) => key === name).length, 1, `${route} must declare only one ${name}`);
        assert.equal(meta.get(name), socialImage, `${route} must use the versioned landscape card, not a cropped app icon`);
    }
    for (const name of ['og:image:alt', 'twitter:image:alt'])
        assert.equal(meta.get(name), socialImageAlt, `${route} needs descriptive social-image alternative text`);
    assert.equal(meta.get('og:image:type'), 'image/png', `${route} must declare the correct social-image format`);
    assert.equal(meta.get('og:image:width'), '1200', `${route} must declare the correct social-image width`);
    assert.equal(meta.get('og:image:height'), '630', `${route} must declare the correct social-image height`);
    assert.ok(!/<img\b[^>]*src="[^"]*\/og\.png|<link\b[^>]*rel="preload"[^>]*og\.png/.test(html), `${route} must not download the social-only image during normal page loads`);
    const css = [...head.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g) ].map(match => match[1]).join('\n');
    assert.ok(css.length > 1000 && css.includes('.site-header') && css.includes('.code-heading'), `${route} must inline the actual site CSS in the head`);
    assert.match(css, /font-family:-apple-system/, `${route} must use the local system font stack`);
    if (html.includes('class="document-grid wrap"'))
    {
        const gridRules = [...css.matchAll(/\.document-grid\{([^{}]*)\}/g) ].map(match => match[1]);
        const columns = gridRules.map(rule => rule.match(/(?:^|;)grid-template-columns:([^;]+)/)?.[1]).filter(Boolean);
        assert.deepEqual(columns, [ '210px minmax(0,1fr)', '180px minmax(0,1fr)', '1fr' ], `${route} must give the article the remaining width and stack navigation on small screens`);
        const gaps = gridRules.map(rule => rule.match(/(?:^|;)gap:([^;]+)/)?.[1]?.replace(/\s+/g, '')).filter(Boolean);
        assert.deepEqual(gaps, [ 'min(32px,var(--gutter))' ], `${route} must use one compact document gap that never exceeds the page inset`);
        assert.ok(gridRules.every(rule => !/justify-content:space-(?:between|around|evenly)/.test(rule)), `${route} must not push the article away from its navigation`);
    }
    if (route === '/')
    {
        assert.ok(css.includes('--screenshot-caption-gap:20px'), 'Screenshot captions must share a 20 pixel gap');
        const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g) ];
        for (const selector of ['.hero-visual', '.menu-visual', '.screenshot-figure'])
        {
            const declarations = rules.filter(([, selectors ]) => selectors.split(',').some(value => value.trim() === selector)).map(([, , body ]) => body);
            assert.ok(declarations.some(body => /(?:^|;)display:(?:grid|flex)(?:;|$)/.test(body)), `${selector} must use a layout that applies caption gaps`);
            assert.ok(declarations.some(body => body.includes('gap:var(--screenshot-caption-gap)')), `${selector} must use the shared caption spacing`);
            for (const body of declarations)
            {
                const gap = body.match(/(?:^|;)gap:([^;]+)/)?.[1];
                if (gap)
                    assert.equal(gap, 'var(--screenshot-caption-gap)', `${selector} must preserve caption spacing at every breakpoint`);
                const padding = body.match(/(?:^|;)padding:([^;]+)/)?.[1];
                if (padding)
                    assert.ok(padding.split(/\s+/).every(value => /^\d+px$/.test(value) && Number.parseInt(value) >= 20), `${selector} must keep its caption gap within the outer inset`);
            }
        }
        const normalizeSelector = value => value.trim().replace(/\s*>\s*/g, '>');
        const panelRules = selector => rules.filter(([, selectors ]) => selectors.split(',').some(value => normalizeSelector(value) === normalizeSelector(selector))).map(([, , body ]) => body);
        assert.ok(panelRules('.comparison-item').every(body => !body.includes('grid-template-rows:subgrid')), 'Comparison cards must retain their content height without stretched inner rows');
        assert.ok(panelRules('.screenshot-grid').some(body => body.includes('align-items:stretch')), 'Paired screenshot cards must share their row height');
        assert.ok(panelRules('.screenshot-figure').some(body => body.includes('grid-template-rows:1fr auto')), 'Screenshot cards must align image bottoms while accommodating different captions and image proportions');
        assert.ok(panelRules('.screenshot-figure').every(body => !/(?:^|;)(?:min-|max-)?(?:height|block-size):/.test(body)), 'Screenshot cards must retain natural heights when stacked');
        assert.ok(panelRules('.screenshot-figure img').some(body => body.includes('width:100%') && body.includes('height:auto')), 'Equal-height screenshot cards must preserve each full image and its original proportions');
        assert.ok(panelRules('.native-grid').some(body => body.includes('align-items:stretch')), 'The paired technique panels must share their row height');
        assert.ok(panelRules('.native-feature').some(body => body.includes('grid-template-rows:auto auto 1fr auto')), 'Technique panel notes must retain the bottom inset while the body adapts to the paired content');
        assert.ok(panelRules('.native-feature').every(body => !/(?:^|;)(?:min-|max-)?(?:height|block-size):/.test(body)), 'Technique panels must size naturally when stacked, without fixed or minimum heights');
        for (const selector of ['.hero-visual', '.comparison-item', '.native-feature', '.savings-example', '.savings-stages > li', '.savings-example-result', '.menu-visual', '.code-block', '.safety-note', '.screenshot-figure', '.companion-panel', '.changelog-list', '.notice', '.help-note', '.support-option', '.appearance-menu', '.faq-list summary', 'th', 'td'])
        {
            const declarations = panelRules(selector);
            const paddings = declarations.map(body => body.match(/(?:^|;)padding:([^;]+)/)?.[1]).filter(Boolean);
            assert.ok(paddings.length > 0, `${selector} must declare its inner inset`);
            assert.ok(paddings.every(value => /^\d+px$/.test(value)), `${selector} must use one equal inset on all four sides at every breakpoint`);
            assert.ok(declarations.every(body => !/(?:^|;)padding-(?:top|right|bottom|left|inline|block)/.test(body)), `${selector} must not override individual panel edges`);
        }
        const changelogItemRules = panelRules('.changelog-list li').join(';');
        assert.ok(changelogItemRules.includes('margin-inline-start:1em') && changelogItemRules.includes('padding-inline-start:4px'), 'Changelog bullets need their own gutter inside the panel inset');
        assert.ok(panelRules('.document-content ul:not(.changelog-list)').length > 0, 'Generic document lists must not override changelog panel spacing');
        assert.ok(panelRules('.code-block').some(body => body.includes('padding:24px') && body.includes('gap:12px')), 'Code panels must own their equal outer inset and compact internal gap');
        assert.ok(panelRules('pre').every(body => !/(?:^|;)padding:(?!0(?:;|$))/.test(body)), 'Code content must not add a second inset inside its padded panel');
        assert.ok(panelRules('.faq-answer').some(body => body.includes('padding:0 24px 24px')), 'Expanded FAQ answers must align with the summary and retain the same bottom inset');
        assert.ok(panelRules('.menu-visual').some(body => body.includes('max-width:454px') && body.includes('padding:32px')) && panelRules('.menu-visual').some(body => body.includes('max-width:438px') && body.includes('padding:24px')), 'Menu screenshot panels must fit the 390 pixel image plus their equal insets');
        assert.match(css, /\.screenshot-disclaimer\{[^}]*margin-top:var\(--screenshot-caption-gap\)/, 'Screenshot group descriptions must retain the same separation');
    }
    assert.ok(!/@font-face|@import|<link\b[^>]*rel="stylesheet"/.test(css + html), `${route} must not depend on a late stylesheet or font download`);
    assert.ok(!/<style\b/.test(html.slice(html.indexOf('<body>'))), `${route} must not introduce styles after the body starts`);
    const boot = [...head.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g) ].find(match => match[2].includes('diskpress-appearance'));
    assert.ok(boot && !/\basync\b|\bdefer\b|\btype=/.test(boot[1]), `${route} must set the appearance synchronously before paint`);
    assert.ok(boot[2].includes('dataset.enhanced'), `${route} must initialize enhanced controls before paint`);
    assert.ok(!/<select\b[^>]*id="appearance"/.test(html), `${route} must use the site-styled appearance menu`);
    assert.match(html, /<button\b[^>]*id="appearance"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/, `${route} needs an accessible, initially closed appearance trigger`);
    assert.match(html, /<button\b[^>]*id="appearance"[^>]*>\s*<span>Appearance<\/span>/, `${route} must visibly identify the control as Appearance`);
    assert.match(html, /id="appearance-menu"[^>]*role="menu"[^>]*hidden/, `${route} must keep the appearance popup hidden before interaction`);
    assert.equal((html.match(/role="menuitemradio"/g) || []).length, 3, `${route} needs three appearance choices`);
    for (const value of ['system', 'light', 'dark'])
        assert.ok(html.includes(`data-appearance-choice="${value}"`), `${route} is missing the ${value} appearance choice`);
    assert.ok(css.includes('.appearance-menu') && css.includes('.appearance-trigger'), `${route} must inline the appearance menu styles before rendering`);
    assert.ok(boot[2].includes("addEventListener('diskpress:appearance-ready', syncAppearanceControl)"), `${route} must prepare synchronous appearance label restoration`);
    const appearanceLabelPosition = html.indexOf("document.dispatchEvent(new Event('diskpress:appearance-ready'))");
    assert.ok(appearanceLabelPosition >= 0 && appearanceLabelPosition < html.indexOf('</header>'), `${route} must restore the appearance label before the header is complete`);
    assert.ok(!/in development|\/Users\/ighor\/|localhost|127\.0\.0\.1/.test(html), `${route} contains outdated development wording or local-only content`);
    if (appStoreAvailable)
    {
        assert.ok(!/Available soon|available soon|coming soon|awaiting App Store approval|Awaiting App Store approval/.test(html), `${route} must remove pending-release wording after launch`);
        assert.ok(!html.includes('class="release-status'), `${route} must restore the download link after launch`);
    }
    else
    {
        const header = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0];
        assert.match(header || '', /<span class="release-status compact">\s*Available soon/, `${route} must show the availability status in the header`);
        assert.ok(!/<(?:a|button)\b[^>]*class="[^"]*release-status/.test(html), `${route} must not make the pending-release status look interactive to assistive technology`);
        assert.ok(!/Get DiskPress|Download on the Mac App Store|Download DiskPress again/.test(html), `${route} must not offer an unavailable download`);
        assert.ok(css.includes('.release-status{') && css.includes('.header-actions>.release-status'), `${route} must include themed, responsive availability styling before paint`);
    }
    assert.ok(!/[\u00a0\u200b-\u200f\u2028\u2029\u2060\ufeff\u2018\u2019\u201c\u201d]/.test(html), `${route} contains unsupported quote or whitespace characters`);
    const nameLinks = [...html.matchAll(/<a\b[^>]*>Ighor July<\/a>/g) ].map(match => match[0]);
    assert.ok(nameLinks.length >= 3, `${route} must link every footer mention of the developer`);
    assert.equal(nameLinks.length, (html.match(/Ighor July/g) || []).length, `${route} must link every developer-name mention`);
    for (const link of nameLinks)
        assert.equal(decode(link.match(/\bhref="([^"]+)"/)?.[1] || ''), developerProfile, `${route} must link the developer name to the supplied profile URL`);
    assert.ok(html.includes(`href="${developerBlog}">Reverse Everything blog</a>`), `${route} must preserve the separate blog link`);
    developerLinks += nameLinks.length;
    for (const match of html.matchAll(/<img\b[^>]*>/g))
    {
        assert.match(match[0], /\balt(?:="[^"]*"|(?=\s|>))/, `${route} image needs an alt attribute`);
        assert.match(match[0], /\bwidth="\d+"/, `${route} image needs reserved width`);
        assert.match(match[0], /\bheight="\d+"/, `${route} image needs reserved height`);
    }
    for (const match of html.matchAll(/<button\b[^>]*data-copy-target[^>]*>/g))
    {
        assert.ok(!/\bhidden\b/.test(match[0]), `${route} must reserve its copy controls from the first render`);
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g) ].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${route} has duplicate IDs`);
}

assert.match(documents.get('/faq/'), /id="ssd-wear"/, 'The FAQ must explain SSD writes and folder suitability');
if (!appStoreAvailable)
{
    const availabilityAnswer = documents.get('/faq/').match(/<details\b[^>]*id="download-price"[^>]*>[\s\S]*?<\/details>/)?.[0];
    assert.ok(availabilityAnswer?.includes('awaiting App Store approval') && availabilityAnswer.includes('not yet available to download') && availabilityAnswer.includes('no confirmed release date'), 'The FAQ must explain pending approval without promising a date');
    assert.ok(availabilityAnswer.includes('price, regional availability, and requirements once it is live'), 'The FAQ must not imply a current price listing');
    const home = documents.get('/');
    const hero = home.match(/<section\b[^>]*class="hero wrap"[^>]*>[\s\S]*?<\/section>/)?.[0];
    assert.ok(hero?.includes('Available soon on the Mac App Store') && hero.includes('Awaiting App Store approval'), 'Availability must be prominent beside the hero');
    assert.ok(home.includes('DiskPress will be available soon. Check back here for the release.'), 'The closing section must reflect pending availability');
    assert.match(home, /<meta name="description" content="DiskPress is coming soon to the Mac App Store\./, 'Search and social metadata must not imply immediate availability');
    assert.ok(documents.get('/cli/').includes('These instructions apply once the app is installed'), 'The CLI guide must explain that commands require the app');
    assert.ok(documents.get('/terms-of-service/').includes('not yet available to download or purchase'), 'Purchase information must reflect pending availability');
}
for (const route of ['/', '/cli/'])
{
    assert.ok(documents.get(route).includes('href="/faq/#ssd-wear"'), `${route} must link to the SSD-write guidance`);
    assert.match(documents.get(route), /disk writes/, `${route} must disclose optimization writes`);
}

for (const route of ['/', '/faq/'])
{
    const answer = documents.get(route).match(/<details\b[^>]*id="offline"[^>]*>[\s\S]*?<\/details>/)?.[0];
    assert.ok(answer?.includes('does not upload your files, filenames, or optimization results'), `${route} must explain that user data stays local`);
    assert.ok(answer.includes('File optimization works offline') && answer.includes('href="/privacy-policy/#mac-app-store"') && answer.includes('href="/privacy-policy/#setapp"'), `${route} must distinguish local optimization from each version's service reporting`);
    assert.ok(answer.includes('application integrity check fails') && answer.includes('automatically opens a diagnostic webpage with a numeric check identifier'), `${route} must disclose automatic integrity-diagnostic visits`);
    assert.ok(answer.includes('cookie-free Plausible analytics') && answer.includes('count these visits by failure code'), `${route} must explain website analytics for diagnostic visits`);
    assert.ok(answer.includes('href="/privacy-policy/#application"'), `${route} must link to the detailed application privacy explanation`);
}
const privacyPolicy = documents.get('/privacy-policy/');
assert.ok(privacyPolicy.includes('Application integrity diagnostics') && privacyPolicy.includes('<code>utm_source=diskpress</code>') && privacyPolicy.includes('numeric <code>utm_content</code> value identifying the failed check'), 'The privacy policy must explain the diagnostic campaign value');
assert.ok(privacyPolicy.includes('also applies when the app is serving a CLI command') && privacyPolicy.includes('no filenames, local paths, optimization results, or per-user identifier'), 'The privacy policy must explain CLI diagnostics and their limited URL contents');
assert.ok(privacyPolicy.includes('Normal use and errors optimizing individual files do not trigger this visit'), 'The privacy policy must distinguish integrity failures from routine optimization errors');
assert.ok(documents.get('/terms-of-service/').includes('A failed application integrity check automatically opens a diagnostic webpage with a numeric check identifier'), 'The terms must preserve the diagnostic-visit disclosure');
for (const [route, html] of documents)
    assert.ok(!/No app analytics or telemetry|No uploads, analytics, or telemetry|contains no analytics or telemetry|has no account, analytics, telemetry|does not include analytics or telemetry|DiskPress stays offline/.test(html), `${route} must not contradict the diagnostic-visit disclosure`);

const supportPage = documents.get('/support/');
assert.match(supportPage, /<h1>Contact support<\/h1>/, 'The support page needs a clear primary heading');
assert.equal((supportPage.match(/<article class="support-option"/g) || []).length, 2, 'The support page must present both contact options');
assert.ok(supportPage.includes('href="https://github.com/JulyIghor/DiskPress/issues"'), 'Support must use the supplied GitHub issues destination');
assert.ok(supportPage.includes('href="mailto:support@apptrust.app?subject=DiskPress%20support"'), 'Support must preserve the existing email address with a useful subject');
assert.ok(supportPage.includes('Issues and attachments are public') && supportPage.includes('Use email for sensitive information'), 'Support must distinguish public GitHub reports from private email');
assert.ok(supportPage.includes('Your DiskPress version and macOS version') && supportPage.includes('Remove private filenames, paths, passwords'), 'Support must request useful details while protecting private information');
assert.ok(supportPage.includes('keep its recovery files and records intact'), 'Support must preserve unfinished recovery material');
assert.ok(!/<form\b|<iframe\b/.test(supportPage), 'Support must use direct links without an embedded third-party form');
const faqHelp = documents.get('/faq/').match(/<section class="help-note">[\s\S]*?<\/section>/)?.[0];
assert.ok(faqHelp?.includes('href="/support/"'), 'The FAQ help section must lead to the dedicated support page');
assert.ok(privacyPolicy.includes('Issues, comments, and attachments are public') && privacyPolicy.includes('github-general-privacy-statement'), 'The privacy policy must explain public GitHub support separately from email');

const integrityPage = documents.get('/application-corrupted/');
assert.match(integrityPage, /<h1>Application integrity warning<\/h1>/, 'The unlisted help page needs a clear DiskPress warning heading');
assert.ok(integrityPage.includes('data-domain="diskpress.app"') && integrityPage.includes('plausible.init();'), 'The unlisted help page must retain normal Plausible page-view tracking');
if (appStoreAvailable)
{
    assert.ok(integrityPage.includes('Move only the installed DiskPress.app application to the Trash.'), 'Recovery guidance must limit removal to the application bundle');
}
else
{
    assert.ok(integrityPage.includes('before removing or replacing your copy') && integrityPage.includes('a public replacement download is not yet available'), 'Recovery guidance must direct users to support while no replacement download is available');
    assert.ok(!integrityPage.includes('to the Trash'), 'Recovery guidance must not ask users to remove their app before a replacement is available');
}
assert.ok(integrityPage.includes('Do not delete your personal files, DiskPress settings, or recovery records'), 'Recovery guidance must preserve user data and unfinished recovery material');
const setappRecovery = integrityPage.match(/<h3>Setapp version<\/h3>([\s\S]*?)<\/ol>/)?.[1];
assert.ok(setappRecovery?.includes('Choose "Remove Application"') && setappRecovery.includes('Do not choose "Uninstall Completely"'), 'Setapp recovery must preserve app data instead of recommending complete removal');
assert.ok(setappRecovery.includes('Keep Setapp itself installed') && setappRecovery.includes('DiskPress removal dialog'), 'Recovery must target DiskPress only, never the Setapp desktop application');
assert.ok(setappRecovery.includes('Install DiskPress again through Setapp') && !setappRecovery.includes('apps.apple.com'), 'Setapp recovery must reinstall through the original provider');
assert.ok(integrityPage.includes('Do not bypass the warning or disable macOS security protections.'), 'The help page must not recommend bypassing integrity protections');
const integritySupport = integrityPage.match(/<section id="contact-support">[\s\S]*?<\/section>/)?.[0];
assert.ok(integritySupport?.includes('href="/support/">Contact support</a>') && integritySupport.includes('whether the warning returned after reinstalling'), 'The help page must lead to both support options without losing its reporting guidance');
assert.ok(integrityPage.includes('.document-content a:not(.download-link)'), 'Document links must not override download-button contrast');
assert.ok(!/Parall|support@parall\.app/.test(integrityPage), 'The help page must not inherit another application\'s support details or bug claims');
for (const [route, html] of documents)
{
    if (!unlistedRoutes.includes(route))
    {
        for (const unlistedRoute of unlistedRoutes)
            assert.ok(!html.includes(unlistedRoute.slice(1, -1)), `${route} must not expose the direct-only help page, even as plain text`);
    }
}

const screenshotSpecs = [
    [ 'overview', 1622, 1490, [ 480, 768, 1024, 1440, 1622 ], 'eager' ],
    [ 'one-time-review', 1280, 1188, [ 480, 768, 1024, 1280 ], 'lazy' ],
    [ 'one-time-results', 1280, 1218, [ 480, 768, 1024, 1280 ], 'lazy' ],
    [ 'locations', 1880, 1200, [ 480, 768, 1024, 1440, 1880 ], 'lazy' ],
    [ 'exclusions', 1622, 1200, [ 480, 768, 1024, 1440, 1622 ], 'lazy' ],
    [ 'menu-bar', 720, 1178, [ 360, 540, 720 ], 'lazy' ],
];
const homepage = documents.get('/');
const changelog = documents.get('/changelog/');
const currentRelease = changelog?.match(/<section\b[^>]*id="v1-0-4"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert.ok(currentRelease?.includes('DiskPress v1.0.4'), 'The changelog must include the v1.0.4 release');
assert.ok(currentRelease.includes('<time datetime="2026-09-24">September 24, 2026</time>'), 'The v1.0.4 entry must use the App Store release date');
assert.equal((currentRelease.match(/<li>/g) || []).length, 14, 'The v1.0.4 entry must cover all fourteen App Store updates');
for (const phrase of ['Lower memory use', 'reusing the results of the current scan', 'Live file counts', 'preserves work already completed', 'parent and child folders', 'files change or disappear', 'several files in one folder', 'performance cores', 'Low CPU mode', 'Database files and their journals', 'Edits from other apps are preserved', 'Unreadable or read-only files', 'access to saved folders is refreshed', 'every group is already excluded'])
    assert.ok(currentRelease.includes(phrase), `The v1.0.4 entry must include the update about ${phrase}`);
assert.ok(decode(currentRelease).includes(`href="${appStore}"`), 'The v1.0.4 entry must link to the App Store source');
assert.ok(changelog.includes('href="#v1-0-4">Version 1.0.4</a>'), 'The page navigation must link to v1.0.4');
assert.ok(changelog.indexOf('id="v1-0-4"') < changelog.indexOf('id="v1-0-3"'), 'The newest changelog entry must come first');
const release103 = changelog.match(/<section\b[^>]*id="v1-0-3"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert.ok(release103?.includes('DiskPress v1.0.3'), 'The changelog must include the v1.0.3 release');
assert.ok(release103.includes('<time datetime="2026-09-23">September 23, 2026</time>'), 'The v1.0.3 entry must use the App Store release date');
assert.equal((release103.match(/<li>/g) || []).length, 6, 'The v1.0.3 entry must cover all six App Store updates');
for (const phrase of ['large folders now uses less memory', 'carrying scan findings through the same optimization', 'live file counts and clearer progress', 'keeps work that has already finished', 'overlapping saved locations', 'modified or removed during an optimization'])
    assert.ok(release103.includes(phrase), `The v1.0.3 entry must include the update about ${phrase}`);
assert.ok(decode(release103).includes(`href="${appStore}"`), 'The v1.0.3 entry must link to the App Store source');
assert.ok(changelog.includes('href="#v1-0-3">Version 1.0.3</a>'), 'The page navigation must link to v1.0.3');
assert.ok(changelog.indexOf('id="v1-0-3"') < changelog.indexOf('id="v1-0-2"') && changelog.indexOf('id="v1-0-2"') < changelog.indexOf('id="v1-0-1"'), 'Changelog entries must stay in reverse release order');
assert.ok(changelog.includes('DiskPress v1.0.2') && changelog.includes('Faster repeat optimizations with cached duplicate checks and compression results.'), 'The changelog must preserve the v1.0.2 release');
assert.ok(changelog?.includes('DiskPress v1.0.1') && changelog.includes('Added support for macOS 27 Golden Gate.'), 'The changelog must include the v1.0.1 release');
for (const phrase of ['Linked App option', 'Show Progress', 'File metadata cannot be preserved', 'automatic recovery', 'tiny files', 'Temporary scan failures now retry automatically', 'CLI statistics', 'Storage Saver Duo', 'Locations table sizing'])
    assert.ok(changelog.includes(phrase), `The changelog must preserve the v1.0.1 note about ${phrase}`);
if (appStoreAvailable)
{
    const bundleSection = homepage.match(/<section\b[^>]*id="storage-saver-duo"[^>]*>[\s\S]*?<\/section>/)?.[0];
    assert.ok(bundleSection?.includes('DiskPress and App Archiver together at a reduced price compared with buying them separately') && decode(bundleSection).includes(`href="${appBundle}"`), 'The companion section must explain the discounted two-app bundle and link to its exact listing');
    assert.ok(homepage.includes('href="#storage-saver-duo"') && bundleSection.includes('Get Storage Saver Duo') && bundleSection.includes('current pricing and system requirements'), 'The bundle must be discoverable from the hero and direct visitors to current App Store details');
    const priceAnswer = documents.get('/faq/').match(/<details\b[^>]*id="download-price"[^>]*>[\s\S]*?<\/details>/)?.[0];
    assert.ok(priceAnswer?.includes('Storage Saver Duo') && decode(priceAnswer).includes(`href="${appBundle}"`) && priceAnswer.includes('includes both apps at a reduced price'), 'The pricing FAQ must include the bundle option alongside the standalone download');
}
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
for (const attribute of ['width="56"', 'height="56"', 'sizes="56px"', 'loading="lazy"'])
    assert.ok(companionIcon.includes(attribute), `The companion icon needs ${attribute}`);
const companionVariants = companionIcon.match(/\bsrcset="([^"]+)"/)?.[1].split(',').map(candidate => candidate.trim().split(/\s+/));
assert.deepEqual(companionVariants?.map(([, descriptor ]) => descriptor), [ '56w', '112w', '168w' ], 'The companion icon needs standard, 2x, and 3x display sizes');
for (const [url] of companionVariants)
{
    assert.ok(url.startsWith('/_astro/app-archiver-icon.') && url.endsWith('.webp'), 'The companion icon must use local optimized WebP variants');
    const icon = await readFile(path.join(root, url));
    assert.ok(icon.length < 24 * 1024, 'Each companion icon variant must remain lightweight');
    assert.equal(icon.toString('ascii', 0, 4), 'RIFF');
    assert.equal(icon.toString('ascii', 8, 12), 'WEBP');
}
assert.match(homepage, /<h2>Two techniques\.<br\s*\/?>Working together\.<\/h2>/, 'The homepage must present compression and deduplication as a combined workflow');
assert.ok(homepage.includes('combines file compression and file deduplication in one optimization workflow'), 'The feature introduction must explain that both techniques work together');
for (const [route, html] of documents)
    assert.ok(!/Two ways to save|Nothing new to open/.test(html), `${route} must not present the techniques as alternative choices`);
assert.ok(documents.get('/faq/').includes('both techniques together in one optimization workflow'), 'The FAQ must explain the combined optimization workflow');
assert.ok(documents.get('/cli/').includes('combine file compression with file deduplication'), 'The CLI guide must explain the combined optimization workflow');
assert.ok(documents.get('/cli/').includes('Deduplication must be enabled.'), 'The CLI guide must preserve its configuration requirement');
const cliGuide = documents.get('/cli/');
const cliSection = id => cliGuide.match(new RegExp(`<section id="${id}">([\\s\\S]*?)<\\/section>`))?.[1] || '';
assert.ok(cliSection('commands').includes('class="cli-command-table"') && cliSection('commands').includes('aria-label="CLI commands" tabindex="0"'), 'The command reference must remain keyboard-scrollable with a dedicated table style');
assert.match(cliGuide, /\.cli-command-table\{min-width:480px\}/, 'The command reference must stay readable on small screens');
const cliCommandColumn = cliGuide.match(/\.cli-command-table th:first-child,\.cli-command-table td:first-child\{([^}]+)\}/)?.[1] || '';
assert.ok(cliCommandColumn.includes('width:140px') && cliCommandColumn.includes('white-space:nowrap'), 'Command names must not split across lines');
const cliQuickStart = cliSection('quick-start');
assert.ok(cliQuickStart.includes('Mac App Store and Setapp editions keep separate settings and saved authorizations'), 'The CLI guide must use the permissions and executable from the same edition');
assert.ok(cliQuickStart.includes('without recurring monitoring, automatic startup registration, or an initial saved-location savings scan') && cliQuickStart.includes('commands and that read-only refresh finish'), 'The CLI quick start must distinguish windowless startup from the refresh after optimization');
const cliRuntime = cliSection('runtime');
assert.ok(cliRuntime.includes('first duplicate check can take a long time') && cliRuntime.includes('cached fingerprints for unchanged files') && cliRuntime.includes('content and metadata verification'), 'The CLI guide must explain first-run cost, cached repeat checks, and verification');
assert.ok(cliRuntime.includes('turn off "Deduplicate identical files" in Settings') && cliRuntime.includes('no per-command compression-only flag'), 'Compression-only CLI guidance must use the actual Settings control, not an invented flag');
for (const mode of ['Compress + Deduplicate', 'Compress Only', 'Deduplicate Only', 'Disabled'])
    assert.ok(cliRuntime.includes(`<strong>${mode}</strong>`), `The CLI guide must document saved-location mode ${mode}`);
assert.ok(cliRuntime.includes('even for files passed individually or with <code>--ignore-exclusions</code>') && cliRuntime.includes('most specific matching saved location takes precedence') && cliRuntime.includes('including a disabled parent'), 'CLI location modes must cover explicit files, exclusion overrides, and nested-location precedence');
assert.ok(cliRuntime.includes('does not enable compression for Deduplicate Only or Disabled locations') && cliRuntime.includes('does not currently include the per-location optimization mode') && cliRuntime.includes('<code>settings.deduplicationEnabled</code> is the global switch'), 'The guide must distinguish location modes from the global deduplication setting and avoid inventing JSON mode fields');
assert.ok(cliRuntime.includes('Recent File Protection does not delay CLI requests') && cliRuntime.includes('with or without <code>--gui</code>') && cliRuntime.includes('selected target is a saved location'), 'The CLI guide must explain the Recent File Protection exception in both presentation modes');
assert.ok(cliRuntime.includes('Active-writer detection, file-change checks, and verification still apply'), 'Skipping the recent-file delay must not imply bypassing safety checks');
assert.ok(cliRuntime.includes('Linked App') && cliRuntime.includes('files you name individually through the CLI') && cliRuntime.includes('<code>--ignore-exclusions</code> does not bypass it'), 'The CLI guide must preserve linked-app protection for explicit targets and overrides');
for (const field of ['linkedApplication', 'bundleIdentifier', 'path', 'name'])
    assert.ok(cliRuntime.includes(`<code>${field}</code>`), `The CLI guide must document linked-app field ${field}`);
const cliOutput = cliSection('output');
assert.ok(cliOutput.includes('NDJSON') && cliOutput.includes('CLI labels, help, and generated messages use English') && cliOutput.includes('Saved records and shared diagnostics retain their original text'), 'Automation must not assume one JSON document or match localized messages');
assert.ok(cliOutput.includes('partial success or cancellation') && cliOutput.includes('top-level <code>reasons</code> are recent human-readable'), 'The CLI guide must distinguish result events and optimization summaries from structured scan reasons');
assert.ok(cliOutput.includes('do not add those two file counts') && cliOutput.includes('Reasons can overlap'), 'The CLI guide must not double-count optimization outcomes or scan reasons');
for (const field of ['alreadyCompressedFiles', 'insufficientSavingsFiles', 'noBenefitFiles'])
    assert.ok(cliOutput.includes(`<code>${field}</code>`), `The CLI guide must document outcome counter ${field}`);
const cliProgress = cliSection('progress');
assert.ok(cliProgress.includes('class="cli-progress-table"') && cliProgress.includes('aria-label="CLI progress fields" tabindex="0"'), 'The progress reference must keep its dedicated table inside a keyboard-scrollable region');
assert.match(cliGuide, /\.cli-progress-table\{min-width:600px\}/, 'Long progress field names must remain readable on small screens');
for (const field of ['phaseProcessedFiles', 'phaseTotalFiles', 'processedFiles', 'totalFiles', 'currentPath', 'currentFile', 'grouping_duplicates', 'cancelled', 'cancelling'])
    assert.ok(cliProgress.includes(field), `The CLI guide must document progress field or stage ${field}`);
assert.ok(cliProgress.includes('total is unknown') && cliProgress.includes('counts can restart') && cliProgress.includes('absent or empty value clears the previous item'), 'CLI progress must handle indeterminate stages, counter resets, and cleared paths');
assert.ok(cliProgress.includes('not present on every progress event') && cliProgress.includes('Wait for the final event and process exit'), 'The cancellation flag must be optional on progress events and must not imply an immediate stop');
const cliMeasurements = cliSection('measurements');
for (const field of ['measurementAvailable', 'measurementStale', 'measurementError', 'measuredAt', 'savings.complete', 'unmeasuredLocationCount', 'staleLocationCount', 'oldestMeasurementAt', 'savings.refreshing', 'savings.refreshError', 'monitoring.serviceRunning', 'monitoring.liveStatusAvailable'])
    assert.ok(cliMeasurements.includes(`<code>${field}</code>`), `The CLI guide must document measurement field ${field}`);
assert.ok(cliMeasurements.includes('last successful values instead of replacing them with zero') && cliMeasurements.includes('before this read-only refresh finishes'), 'CLI measurement guidance must preserve stale values and explain the asynchronous refresh');
for (const value of ['availability', 'available', 'unavailable', 'stale_bookmark', 'missing', 'invalid_authorization'])
    assert.ok(cliMeasurements.includes(`<code>${value}</code>`), `The CLI guide must document location availability ${value}`);
assert.ok(cliMeasurements.includes('saved states, not a fresh permission check') && cliMeasurements.includes('no longer matches the originally authorized file or folder') && cliMeasurements.includes('Removing a location does not delete its files'), 'Location authorization guidance must explain saved status, changed identity, and safe reauthorization');
const cliSettings = cliSection('settings-activity');
assert.ok(cliSettings.includes('profiles also apply to CLI optimization') && cliSettings.includes('performance-core count') && cliSettings.includes('not a fixed CPU percentage limit'), 'CLI performance guidance must explain the shared scheduler without promising a fixed CPU cap');
assert.ok(cliSettings.includes('<code>databases</code>') && cliSettings.includes('<code>database.sqlite-wal</code>') && cliSettings.includes('<code>database.sqlite-shm</code>') && cliSettings.includes('<code>database.sqlite-journal</code>') && cliSettings.includes('not every companion filename pattern'), 'Database exclusions must include companion files without implying the JSON extension list includes every pattern');
const cliCancellation = cliSection('exit-codes');
assert.ok(cliCancellation.includes('breaking its output pipe also cancels work') && cliCancellation.includes('process exit code remains authoritative'), 'The CLI guide must explain broken output pipes and safe completion');
assert.ok(cliCancellation.includes('Exit 75 does not prove that no files changed') && cliCancellation.includes('not replayed after a host crash'), 'The CLI guide must prevent blind retries after an uncertain result');
assert.ok(cliCancellation.includes('Removing a saved location involved in an active CLI optimization') && cliCancellation.includes('<code>exitCode</code> 130') && cliCancellation.includes('<code>cancelled</code> set to <code>true</code>') && cliCancellation.includes('Completed optimizations are kept'), 'The CLI guide must explain service-initiated cancellation and retained results');
const cliFaq = documents.get('/faq/').match(/<details\b[^>]*id="cli-agents"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(cliFaq?.includes('do not apply the Recent File Protection delay') && cliFaq.includes('host stays open until its commands and the refresh are complete'), 'The CLI FAQ must agree with the detailed delay and host-lifetime guidance');
assert.ok(cliFaq.includes('respects saved-location modes') && cliFaq.includes('most specific matching location takes precedence') && cliFaq.includes('CLI reports do not currently include them'), 'The CLI FAQ must agree with the saved-location mode guidance');
assert.match(homepage, /<h3>File compression<\/h3>/, 'The homepage must name the file compression feature explicitly');
assert.match(homepage, /<h3>File deduplication<\/h3>/, 'The homepage must name the file deduplication feature explicitly');
const deduplicationFeature = [...homepage.matchAll(/<article\b[^>]*class="native-feature"[^>]*>[\s\S]*?<\/article>/g) ].map(match => match[0]).find(article => article.includes('<h3>File deduplication</h3>'));
assert.ok(deduplicationFeature?.includes('DiskPress is not a duplicate file remover.'), 'The feature description must distinguish file deduplication from duplicate deletion');
assert.ok(deduplicationFeature.includes('APFS copy-on-write clones') && deduplicationFeature.includes('Both files keep their paths.'), 'The feature description must explain storage sharing without removing file paths');
assert.ok(deduplicationFeature.includes('across all enabled saved locations, not just within each folder') && homepage.includes('extra deduplication savings in folders you already optimized'), 'The homepage must explain cross-location deduplication and the benefit of adding locations');
const crossLocationAnswer = documents.get('/faq/').match(/<details\b[^>]*id="cross-location-deduplication"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(crossLocationAnswer?.includes('across all enabled saved locations, not just within each location') && crossLocationAnswer.includes('same compatible APFS volume'), 'The FAQ must explain cross-location matching without implying cross-volume sharing');
assert.ok(crossLocationAnswer.includes('The next optimization') && crossLocationAnswer.includes('extra savings in locations you already optimized') && crossLocationAnswer.includes('Adding a location alone does not perform deduplication'), 'The FAQ must explain that additional savings require optimization, not merely adding a location');
assert.ok(crossLocationAnswer.includes('With deduplication enabled') && crossLocationAnswer.includes('Disabled locations are not processed') && crossLocationAnswer.includes('exclusions and safety checks still apply'), 'Cross-location matching must respect the enabled locations, settings, and safety rules');
for (const route of ['/', '/faq/'])
{
    const answer = documents.get(route).match(/<details\b[^>]*id="deduplication"[^>]*>[\s\S]*?<\/details>/)?.[0];
    assert.ok(answer?.includes('Is DiskPress a duplicate file remover?') && answer.includes('No. DiskPress is not a duplicate file remover.'), `${route} must explicitly answer the duplicate-remover question`);
    assert.ok(answer.includes('Both files stay available at their existing paths.') && answer.includes('After verifying identical contents'), `${route} must explain verified replacement without losing either file`);
    assert.ok(answer.includes('APFS (Apple File System) copy-on-write clone') && answer.includes('same physical data blocks'), `${route} must explain APFS clone storage sharing`);
    assert.ok(answer.includes('Metadata still takes some space') && answer.includes('later edits can use more space'), `${route} must not promise zero storage overhead`);
    assert.ok(answer.includes('edit or delete either file without changing the other') && answer.includes('same APFS volume'), `${route} must preserve file independence and the same-volume requirement`);
    assert.ok(answer.includes('href="https://developer.apple.com/documentation/foundation/about-apple-file-system"'), `${route} must link the APFS explanation to Apple documentation`);
}
const quitAppAnswer = documents.get('/faq/').match(/<details\b[^>]*id="quit-app"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(quitAppAnswer?.includes('not to read them') && quitAppAnswer.includes('without a proprietary DiskPress format or reader') && quitAppAnswer.includes('Another Mac'), 'The FAQ must explain that optimized files remain readable without DiskPress');
const hyperspaceAnswer = documents.get('/faq/').match(/<details\b[^>]*id="hyperspace-comparison"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(hyperspaceAnswer?.includes('APFS clones') && hyperspaceAnswer.includes('Shortcuts automation') && hyperspaceAnswer.includes('recurring folder monitoring'), 'The FAQ must explain the combined DiskPress and Hyperspace distinction');
const cloudAnswer = documents.get('/faq/').match(/<details\b[^>]*id="cloud-files"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(cloudAnswer?.includes('downloaded local copy') && cloudAnswer.includes('cloud-only placeholders') && cloudAnswer.includes('never downloads'), 'The FAQ must distinguish downloaded cloud files from placeholders');
assert.ok(cloudAnswer.includes('may treat that replacement as a change') && cloudAnswer.includes('do not assume either outcome'), 'The FAQ must keep cloud re-upload behavior conditional');
const requirementsAnswer = documents.get('/faq/').match(/<details\b[^>]*id="requirements"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(requirementsAnswer?.includes('NAS mounts') && requirementsAnswer.includes('read-only volumes are not optimization targets'), 'The FAQ must distinguish supported local storage from NAS and read-only targets');
const backupAnswer = documents.get('/faq/').match(/<details\b[^>]*id="backup-restore"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(backupAnswer?.includes('without DiskPress') && backupAnswer.includes('may not survive copying or backup') && backupAnswer.includes('more space'), 'The FAQ must explain backup restoration without overstating storage savings');
const diskSpaceAnswer = documents.get('/faq/').match(/<details\b[^>]*id="disk-space-numbers"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(diskSpaceAnswer?.includes('Finder folder sizes') && diskSpaceAnswer.includes('logical size') && diskSpaceAnswer.includes('rather than allocated storage'), 'The disk-space FAQ must distinguish Finder folder sizes from actual allocated storage');
assert.ok(diskSpaceAnswer.includes('Use Get Info instead.') && diskSpaceAnswer.includes('Select any folder in Finder, press Command-I') && diskSpaceAnswer.includes('"on disk" value') && diskSpaceAnswer.includes('Let the calculation finish'), 'The FAQ must explain how to check any folder in Get Info, not just applications');
assert.ok(diskSpaceAnswer.includes('APFS clones share storage') && diskSpaceAnswer.includes('count shared blocks more than once') && diskSpaceAnswer.includes('does not predict exactly how much space deleting a folder would free'), 'Get Info guidance must preserve shared-storage and space-reclamation caveats');
assert.ok(diskSpaceAnswer.includes('reclaimable storage as well as free space') && diskSpaceAnswer.includes('Snapshots') && diskSpaceAnswer.includes('home volume'), 'The FAQ must preserve the distinction between folder sizes and volume-level available space');
assert.ok(diskSpaceAnswer.includes('href="https://reverseeverything.com/blog/weve-been-reading-macos-disk-space-wrong-since-tahoe/"'), 'The disk-space FAQ must link the supplied explanatory article');
const linkedAppAnswer = documents.get('/faq/').match(/<details\b[^>]*id="linked-app"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(linkedAppAnswer?.includes('Linked App option') && linkedAppAnswer.includes('while the selected app is running') && linkedAppAnswer.includes('CLI operations'), 'The FAQ must document Linked App behavior across operation modes');
const aiDevelopmentAnswer = documents.get('/faq/').match(/<details\b[^>]*id="ai-development"[^>]*>[\s\S]*?<\/details>/)?.[0];
assert.ok(aiDevelopmentAnswer?.includes('translations, website content, artwork concepts') && aiDevelopmentAnswer.includes('review and test') && aiDevelopmentAnswer.includes('How to Use AI Without Losing Control'), 'The FAQ must explain the developer\'s AI-assisted workflow');
const originalData = 2 * 100;
const compressedData = originalData * (1 - 30 / 100);
const sharedData = compressedData / 2;
const savedData = originalData - sharedData;
const savedPercent = savedData / originalData * 100;
const savingsExample = homepage.match(/<figure\b[^>]*id="combined-savings"[^>]*>[\s\S]*?<\/figure>/)?.[0];
assert.ok(savingsExample, 'The homepage must illustrate combined compression and deduplication savings');
assert.ok(savingsExample.includes('aria-labelledby="savings-example-heading"'), 'The savings illustration must have an accessible caption');
assert.ok(savingsExample.includes('After compression') && savingsExample.includes('After both techniques'), 'The example must show savings building together rather than selectable modes');
for (const [stage, megabytes] of [[ 'original', originalData ], [ 'compressed', compressedData ], [ 'combined', sharedData ]])
{
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
for (const example of [savingsExample, savingsAnswer])
    assert.ok(example.includes('two different enabled saved locations on the same compatible APFS volume'), 'Both savings examples must illustrate file deduplication across locations on one compatible volume');
assert.ok(homepage.includes(`href="${developerBlog}">Read Reverse Everything</a>`), 'The homepage blog link must keep its original destination');
const homepageImages = [...homepage.matchAll(/<img\b[^>]*>/g) ].map(match => match[0]);
for (const [name, width, height, widths, loading] of screenshotSpecs)
{
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
    assert.deepEqual(variants.map(([, descriptor ]) => Number.parseInt(descriptor)), widths, `${name} needs the expected responsive widths`);
    assert.ok(variants.every(([ url, descriptor ]) => url.endsWith('.webp') && /^\d+w$/.test(descriptor) && Number.parseInt(descriptor) <= width), `${name} must use WebP without upscaling`);
    if (loading === 'eager')
        assert.equal(attribute('fetchpriority'), 'high', 'The hero screenshot must have high fetch priority');
}
assert.ok(homepage.includes('App screenshots use example data.'), 'Screenshot savings must be identified as example data');

let internalLinks = 0;
let appStoreLinks = 0;
let appBundleLinks = 0;
let assets = 0;
for (const [route, html] of documents)
{
    for (const match of html.matchAll(/\bhref="([^"]+)"/g))
    {
        const href = decode(match[1]);
        if (href.includes('apps.apple.com'))
        {
            assert.ok(href === appStore || href === appBundle, `${route} must preserve the supplied standalone or bundle URL`);
            if (href === appStore)
                appStoreLinks++;
            else
                appBundleLinks++;
        }
        if (!href.startsWith('/') && !href.startsWith('#'))
            continue;
        const destination = new URL(href, `https://diskpress.app${route}`);
        if (iconAssets.has(destination.pathname))
        {
            assert.ok((await stat(path.join(root, destination.pathname))).size > 0, `${route} is missing an icon`);
            assets++;
            continue;
        }
        const document = documents.get(destination.pathname);
        assert.ok(document, `${route} links to a missing page ${href}`);
        if (destination.hash)
        {
            assert.ok(document.includes(`id="${decodeURIComponent(destination.hash.slice(1))}"`), `${route} links to a missing anchor ${href}`);
        }
        internalLinks++;
    }
    const sources = [...html.matchAll(/\bsrc="(\/[^"?]+)"/g) ].map(match => decode(match[1]));
    for (const match of html.matchAll(/\bsrcset="([^"]+)"/g))
    {
        sources.push(...decode(match[1]).split(',').map(candidate => candidate.trim().split(/\s+/)[0]));
    }
    for (const source of sources)
    {
        assert.ok((await stat(path.join(root, source))).size > 0, `${route} is missing asset ${source}`);
        assets++;
    }
}

const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');
const socialPng = await readFile(path.join(root, new URL(socialImage).pathname));
assert.ok(socialPng.subarray(0, 8).equals(pngSignature), 'The social preview must be a real PNG');
assert.equal(socialPng.readUInt32BE(16), 1200, 'The social preview must be 1200 pixels wide');
assert.equal(socialPng.readUInt32BE(20), 630, 'The social preview must be 630 pixels tall');
assert.ok(socialPng.length < 1024 * 1024, 'Keep the social preview below 1 MiB for quick crawler downloads');
assert.ok(!socialPng.equals(await readFile(path.join(root, 'apple-touch-icon.png'))), 'The social preview must be its own landscape artwork');
for (const [filename, size] of [[ 'favicon-16x16.png', 16 ], [ 'favicon-32x32.png', 32 ], [ 'apple-touch-icon.png', 180 ]])
{
    const png = await readFile(path.join(root, filename));
    assert.ok(png.subarray(0, 8).equals(pngSignature), `${filename} must be a PNG`);
    assert.equal(png.readUInt32BE(16), size, `${filename} has the wrong width`);
    assert.equal(png.readUInt32BE(20), size, `${filename} has the wrong height`);
}
const ico = await readFile(path.join(root, 'favicon.ico'));
assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1, 'The favicon must be an ICO, not a renamed image');
assert.equal(ico.readUInt16LE(4), 4);
for (const [index, size] of [16, 32, 48, 64].entries())
{
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
for (const route of routes)
    assert.ok(sitemap.includes(`<loc>https://diskpress.app${route}</loc>`));
assert.equal((sitemap.match(/<loc>/g) || []).length, routes.length, 'The sitemap must contain only the indexable public pages');
const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Sitemap: https://diskpress.app/sitemap.xml'));
assert.match(robots, /^Allow: \/$/m, 'Crawlers must be allowed to read the noindex page');
for (const route of unlistedRoutes)
{
    assert.ok(!sitemap.includes(route.slice(0, -1)), 'The direct-only help page must stay out of the sitemap');
    assert.ok(!robots.includes(route.slice(0, -1)), 'robots.txt must not advertise or block the direct-only help URL');
}
const headers = await readFile(path.join(root, '_headers'), 'utf8');
const noindexHeaderPaths = headers.trim().split(/\n\s*\n/).filter(block => /X-Robots-Tag:[^\n]*\bnoindex\b/i.test(block)).map(block => block.split('\n')[0]);
assert.deepEqual(noindexHeaderPaths, [ '/application-corrupted', '/application-corrupted/*' ], 'Cloudflare must send noindex headers only for the integrity-help route and its URL variants');
assert.match(documents.get('/404.html'), /noindex, follow/);
if (appStoreAvailable)
    assert.ok(appStoreLinks >= 7, 'Released pages must provide the supplied App Store download links');
else
    assert.equal(appStoreLinks, 0, 'Pending-release pages must not send users to an unavailable App Store listing');
if (appStoreAvailable)
    assert.ok(appBundleLinks >= 2, 'The homepage and pricing FAQ must provide bundle links without replacing standalone downloads');
else
    assert.equal(appBundleLinks, 0, 'Pending-release pages must not offer a bundle containing the unavailable app');
console.log(`Verified ${documents.size} pages, ${internalLinks} internal links, ${appStoreLinks} DiskPress download links, ${appBundleLinks} bundle links, ${developerLinks} developer profile links, ${assets} asset references, widescreen social previews, metadata, sitemap, analytics, and first-paint styling.`);
