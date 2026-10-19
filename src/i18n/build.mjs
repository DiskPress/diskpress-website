import { copyFile, readFile } from 'node:fs/promises';
import { locales, translatedLocales } from './routes.mjs';

// Workers Static Assets serves the nearest 404.html for a missing route.
// Keep the translated route for direct testing and copy its complete HTML for fallback use.
export async function writeLocalizedNotFound(directory) {
  for (const locale of translatedLocales) {
    const source = new URL(`${locale}/404/index.html`, directory);
    const html = await readFile(source, 'utf8');
    if (!html.includes(`lang="${locales[locale].lang}"`) || !html.includes('noindex')) {
      throw new Error(`Invalid localized 404 for ${locale}`);
    }
    await copyFile(source, new URL(`${locale}/404.html`, directory));
  }
}

export function localizedNotFound() {
  return {
    name: 'diskpress-localized-not-found',
    hooks: { 'astro:build:done': async ({ dir }) => writeLocalizedNotFound(dir) },
  };
}
