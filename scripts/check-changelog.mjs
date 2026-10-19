import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// This check uses only Node's built-in modules, with no native build dependencies.
const snapshot = JSON.parse(readFileSync(new URL('./fixtures/changelog-app-store.json', import.meta.url), 'utf8'));
const siteConfig = readFileSync(new URL('../src/consts.ts', import.meta.url), 'utf8');
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#38;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone: snapshot.displayTimeZone, dateStyle: 'long' });
const expectedIds = [
    'v1-1-1', 'ios-v1-0-2', 'ios-v1-0-1', 'ios-v1-0-0', 'v1-0-8',
    'v1-0-7', 'v1-0-6', 'v1-0-5', 'v1-0-4', 'v1-0-3', 'v1-0-2', 'v1-0-1', 'v1-0-0',
];

export function verifyChangelog(content, { rendered = false } = {})
{
    const sections = [...content.matchAll(/<section\b[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/section>/g)];
    const releases = new Map(sections.map(([html, id]) => [id, html]));
    assert.deepEqual(sections.map(([, id]) => id), expectedIds, 'Keep every published release in reverse chronological order with distinct platform anchors');
    assert.ok(content.includes('Release notes for DiskPress for Mac and DiskPress for Files for iPhone and iPad.'), 'The changelog introduction must cover both apps');

    for (const release of snapshot.releases)
    {
        const ios = release.platform === 'ios';
        const id = `${ios ? 'ios-' : ''}v${release.version.replaceAll('.', '-')}`;
        const entry = releases.get(id);
        const app = ios ? 'DiskPress for Files' : 'DiskPress';
        const platform = ios ? 'iPhone and iPad' : 'Mac';
        const setting = ios ? 'IOS_APP_STORE_URL' : 'APP_STORE_URL';
        const label = `${ios ? 'iOS' : 'Mac'} ${release.version}`;
        const date = dateFormatter.format(new Date(release.releasedAt));
        assert.ok(entry, `Missing ${platform} ${release.version}`);
        assert.ok(entry.includes(`<h2>${app} v${release.version}</h2>`), `${id} must identify the correct app`);
        assert.ok(entry.includes(`${platform} - <time datetime="${release.releasedAt}">${date}</time>`), `${id} must preserve Apple's timestamp and show the Pacific release date`);
        const notes = [...entry.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, note]) => decode(note));
        assert.deepEqual(notes, release.notes, `${id} must preserve every published App Store note`);
        if (release.notes.length === 0)
            assert.ok(entry.includes('Apple did not publish release notes for this initial version.'), `${id} must not invent initial release notes`);
        if (rendered)
        {
            const url = siteConfig.match(new RegExp(`export const ${setting} = '([^']+)';`))?.[1];
            assert.ok(url && decode(entry).includes(`href="${url}"`), `${id} must link to the correct app's listing`);
        }
        else
            assert.ok(entry.includes(`href={${setting}}`), `${id} must use the shared platform-specific store link`);
        assert.ok(content.includes(rendered ? `href="#${id}">${label}</a>` : `id: '${id}', label: '${label}'`), `${id} needs a platform-specific navigation label`);
    }

    assert.ok(!/[\u00a0\u200b-\u200f\u2028\u2029\u2060\ufeff\u2018\u2019\u201c\u201d]/.test(content), 'Use standard spaces and ASCII quotes');
    console.log(`Verified ${releases.size} changelog entries and ${snapshot.releases.length} additions against Apple's release history.`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
    verifyChangelog(readFileSync(new URL('../src/pages/changelog.astro', import.meta.url), 'utf8'));
