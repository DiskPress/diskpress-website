import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { localeCodes, localePath } from '../src/i18n/routes.mjs';

export async function verifyReleaseMedia(documents) {
  const sources = JSON.parse(await readFile(new URL('../src/data/screenshot-sources.json', import.meta.url), 'utf8'));
  assert.equal(sources.length, 98, 'Every language needs all 14 release captures');
  assert.equal(new Set(sources.map(image => image.file)).size, 98, 'Screenshot destinations must be unique');
  const names = sources.filter(image => image.locale === 'en').map(image => image.name).sort();
  const root = new URL('../src/assets/releases/', import.meta.url);
  assert.deepEqual((await readdir(root)).sort(), [...localeCodes].sort(), 'Keep only supported screenshot locales');
  for (const locale of localeCodes) {
    const entries = sources.filter(image => image.locale === locale);
    assert.deepEqual(entries.map(image => image.name).sort(), names, `${locale} must have the complete screenshot set`);
    assert.deepEqual((await readdir(new URL(locale + '/', root))).sort(), names.map(name => name + '.png'), `${locale} must have no unused screenshot files`);
    const pages = [documents.get(localePath(locale, '/')), documents.get(localePath(locale, '/ios/'))].join('\n');
    for (const entry of entries) {
      const bytes = await readFile(new URL('../' + entry.file, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${entry.file} must preserve the Fastlane capture`);
      assert.equal(bytes.readUInt32BE(16), entry.width);
      assert.equal(bytes.readUInt32BE(20), entry.height);
      assert.ok(pages.includes('/_astro/' + entry.name + '.'), `${locale} pages must use ${entry.name}`);
    }
  }
  const heroes = localeCodes.map(locale => documents.get(localePath(locale, '/')).match(/src="([^"]*diskpress-overview\.[^"]+)"/)?.[1]);
  assert.ok(heroes.every(Boolean));
  assert.equal(new Set(heroes).size, localeCodes.length, 'Each homepage must show its own localized app capture');
  console.log('Verified all 98 localized release captures, preserved source hashes, dimensions, and page usage.');
}
