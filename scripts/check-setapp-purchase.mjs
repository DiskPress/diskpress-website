import assert from 'node:assert/strict';

// Shared by the built-site check and the native-addon-free source preview.
// These assertions cover English purchase facts, not translated wording.
export function verifySetappPurchase(documents) {
  const listing = 'https://setapp.com/apps/diskpress';
  const homepage = documents.get('/') || '';
  const options = [...homepage.matchAll(/<p\b[^>]*class="fine setapp-option"[^>]*>[\s\S]*?<\/p>/g)].map(([html]) => html);
  assert.equal(options.length, 2, 'Both Mac download areas need a secondary Setapp option');
  for (const option of options) {
    assert.ok(option.includes('one-time purchase') && option.includes(`<a href="${listing}">Setapp</a>`), 'Setapp must be a plain text link described as a one-time purchase');
    assert.ok(option.includes('Same features as the Mac App Store version.'), 'Mac feature parity must remain explicit');
  }
  for (const [tag] of homepage.matchAll(/<a\b[^>]*>/g)) {
    assert.ok(!(tag.includes(listing) && /\bclass="[^"]*download-link/.test(tag)), 'Setapp must remain secondary to the App Store buttons');
  }

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
