/** @type {Record<string, {lang: string, label: string, short: string}>} */
export const locales = {
  en: { lang: 'en', label: 'English', short: 'EN' },
  'zh-hans': { lang: 'zh-Hans', label: '简体中文', short: '简体' },
  'zh-hant': { lang: 'zh-Hant', label: '繁體中文', short: '繁體' },
  de: { lang: 'de', label: 'Deutsch', short: 'DE' },
  'es-mx': { lang: 'es-MX', label: 'Español (México)', short: 'MX' },
  'es-es': { lang: 'es-ES', label: 'Español (España)', short: 'ES' },
  uk: { lang: 'uk', label: 'Українська', short: 'UK' },
};
export const localeCodes = Object.keys(locales);
export const translatedLocales = localeCodes.filter(code => code !== 'en');
export const publicPaths = ['/', '/ios/', '/faq/', '/cli/', '/changelog/', '/support/', '/privacy-policy/', '/terms-of-service/'];
export const allPaths = [...publicPaths, '/application-corrupted/', '/404/'];

export function splitLocale(pathname) {
  const first = pathname.split('/')[1];
  const locale = translatedLocales.includes(first) ? first : 'en';
  let basePath = locale === 'en' ? pathname : pathname.slice(first.length + 1) || '/';
  if (basePath === '/404.html') basePath = '/404/';
  if (!basePath.endsWith('/')) basePath += '/';
  return { locale, basePath };
}

export function localePath(locale, path = '/') {
  if (!Object.hasOwn(locales, locale)) throw new Error('Unsupported locale ' + locale);
  const url = new URL(path, 'https://diskpress.app');
  const { basePath } = splitLocale(url.pathname);
  const localized = locale === 'en' ? basePath : '/' + locale + basePath;
  return localized + url.search + url.hash;
}

export function detectLocale(languages) {
  for (const language of languages) {
    const tag = String(language).toLowerCase().replaceAll('_', '-');
    const [base] = tag.split('-');
    if (['en', 'de', 'uk'].includes(base)) return base;
    if (base === 'zh') {
      if (tag.includes('-hant')) return 'zh-hant';
      if (tag.includes('-hans')) return 'zh-hans';
      return /-(tw|hk|mo)(-|$)/.test(tag) ? 'zh-hant' : 'zh-hans';
    }
    if (base === 'es') return /-(419|mx|ar|bo|cl|co|cr|cu|do|ec|gt|hn|ni|pa|pe|pr|py|sv|us|uy|ve)(-|$)/.test(tag) ? 'es-mx' : 'es-es';
  }
  return 'en';
}
