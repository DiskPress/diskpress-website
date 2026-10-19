import { messageId } from './html.mjs';
import { translatedLocales } from './routes.mjs';
import common from './catalog/common.json' with { type: 'json' };
import home from './catalog/home.json' with { type: 'json' };
import ios from './catalog/ios.json' with { type: 'json' };
import faq from './catalog/faq.json' with { type: 'json' };
import cli from './catalog/cli.json' with { type: 'json' };
import changelog from './catalog/changelog.json' with { type: 'json' };
import privacy from './catalog/privacy.json' with { type: 'json' };
import terms from './catalog/terms.json' with { type: 'json' };
import support from './catalog/support.json' with { type: 'json' };
import integrity from './catalog/integrity.json' with { type: 'json' };
import error from './catalog/error.json' with { type: 'json' };

const catalogs = Object.fromEntries(translatedLocales.map(locale => [locale, {}]));
for (const [file, entries] of Object.entries({ common, home, ios, faq, cli, changelog, privacy, terms, support, integrity, error })) {
  for (const [source, translations] of Object.entries(entries)) {
    if (!Array.isArray(translations) || translations.length !== translatedLocales.length) throw new Error('Six translations required in ' + file);
    const id = /^[a-f0-9]{12}$/.test(source) ? source : messageId(source);
    translatedLocales.forEach((locale, index) => {
      if (Object.hasOwn(catalogs[locale], id)) throw new Error('Duplicate message ' + id);
      catalogs[locale][id] = translations[index];
    });
  }
}
export default catalogs;
