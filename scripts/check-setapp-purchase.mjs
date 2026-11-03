import assert from 'node:assert/strict';

// Shared by the built-site check and the native-addon-free source preview.
// These assertions cover English purchase facts, not translated wording.
export function verifySetappPurchase(documents) {
  const listing = 'https://setapp.com/apps/diskpress';
  const homepage = documents.get('/') || '';
  const options = [...homepage.matchAll(/<p\b[^>]*class="fine setapp-option"[^>]*>[\s\S]*?<\/p>/g)].map(([html]) => html);
  assert.equal(options.length, 2, 'Both Mac download areas must explain the Setapp purchase');
  for (const option of options) {
    assert.ok(option.includes('Setapp offers a one-time purchase for Mac.'), 'Setapp must be described as a one-time purchase');
    assert.ok(option.includes('Same features as the Mac App Store version.'), 'Mac feature parity must remain explicit');
  }
  const badges = [...homepage.matchAll(/<setapp-badge\b[^>]*>[\s\S]*?<\/setapp-badge>/g)].map(([html]) => html);
  assert.equal(badges.length, 2, 'Both Mac download areas must use the official Setapp badge');
  for (const badge of badges) {
    assert.match(badge, /\bappId="2085"/i, 'The badge must identify DiskPress');
    assert.match(badge, /\bvendorId="1651"/i, 'The badge must use the supplied vendor attribution');
    assert.match(badge, /\btheme="dark"/, 'Keep the supplied official badge appearance');
    assert.ok(badge.includes('class="setapp-fallback"') && badge.includes(`href="${listing}"`) && badge.includes('Get it on Setapp'), 'Keep a usable fallback if the badge script is unavailable');
    assert.ok(badge.includes('aria-label="Get DiskPress for Mac on Setapp"'), 'The fallback must identify the Mac product for assistive technology');
  }
  const scriptUrl = 'https://developer.setapp.com/setapp-badge/index.js';
  const scripts = [...homepage.matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag).filter(tag => tag.includes(`src="${scriptUrl}"`));
  assert.equal(scripts.length, 1, 'Load the official script once for both badges');
  assert.match(scripts[0], /\sasync(?:\s|=|>)/, 'The third-party badge must load asynchronously');
  for (const [route, html] of documents) if (route !== '/') {
    assert.ok(!html.includes(scriptUrl), `${route} must not load a badge script when it has no badge`);
  }
  for (const [group] of homepage.matchAll(/<div\b[^>]*class="download-options"[^>]*>[\s\S]*?<\/div>/g)) {
    assert.ok(!group.includes('setapp-badge') && !group.includes(listing), 'The App Store buttons must remain primary, with Setapp in its own secondary row');
  }
  assert.ok(!homepage.includes('class="download-link setapp-download"'), 'The handmade Setapp download button must be replaced');
  assert.ok(documents.get('/privacy-policy/')?.includes('developer.setapp.com') && documents.get('/privacy-policy/').includes('app and vendor referral identifiers'), 'The privacy policy must disclose the third-party badge request and referral link');

  const faq = documents.get('/faq/')?.match(/<details\b[^>]*id="download-price"[^>]*>[\s\S]*?<\/details>/)?.[0] || '';
  assert.ok(faq.includes(`href="${listing}"`) && faq.includes('standalone app with a one-time payment'), 'The pricing FAQ must explain the standalone Setapp purchase');
  assert.ok(faq.includes('It is not included in a Setapp subscription.'), 'The FAQ must rule out subscription access');
  assert.ok(faq.includes('purchase, download, activation, and updates'), 'The FAQ must identify the services handled by Setapp');

  for (const route of ['/privacy-policy/', '/terms-of-service/']) {
    const section = documents.get(route)?.match(/<section\b[^>]*id="setapp"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
    assert.ok(section.includes('standalone app sold with a one-time payment') && section.includes('not included in a Setapp subscription'), `${route} must identify the one-time purchase`);
    assert.ok(section.includes('Activation and license checks') || section.includes('activation and license checks'), `${route} must retain licensing disclosures`);
  }
  const terms = documents.get('/terms-of-service/') || '';
  assert.ok(terms.includes('Review the price and purchase terms shown by Setapp before buying.'), 'Setapp terms must describe buying, not subscribing');
  assert.ok(terms.includes('https://support.setapp.com/'), 'Setapp payment questions need the correct support destination');
  assert.ok(terms.includes('remain readable by macOS without DiskPress'), 'Existing files must remain accessible without the app');
  const support = documents.get('/support/')?.match(/<section\b[^>]*id="billing"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(support.includes('Purchases and refunds') && support.includes('Setapp purchase and refund guidance'), 'Support must route purchase questions without subscription instructions');
  assert.ok(support.includes('href="/terms-of-service/#setapp"'), 'Support must link to the Setapp purchase section');

  const obsolete = /with your Setapp subscription|Setapp subscription<\/a>|Purchases and subscriptions|before subscribing|renewal terms|subscription changes|subscription-dependent format|If your Setapp access expires|Uninstalling DiskPress or Setapp/i;
  for (const route of ['/', '/faq/', '/support/', '/privacy-policy/', '/terms-of-service/']) {
    assert.doesNotMatch(documents.get(route) || '', obsolete, `${route} must not advertise subscription access or renewal and cancellation instructions`);
  }
}
