import { locales } from './routes.mjs';

// Inline in the head. No client-side translation or late language swap is needed.
export function languageBootstrap(locales) {
  // Keep every dependency inside this function so build-time bundling cannot
  // rename a free variable used by the serialized browser script.
  const translatedLocales = Object.keys(locales).filter(code => code !== 'en');
  function splitLocale(pathname) {
    const first = pathname.split('/')[1];
    const locale = translatedLocales.includes(first) ? first : 'en';
    let basePath = locale === 'en' ? pathname : pathname.slice(first.length + 1) || '/';
    if (basePath === '/404.html') basePath = '/404/';
    if (!basePath.endsWith('/')) basePath += '/';
    return { locale, basePath };
  }
  function detectLocale(languages) {
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
  const origin = 'https://diskpress.app';
  const key = 'diskpress-language';
  const visited = 'diskpress-language-visited';
  const { locale, basePath } = splitLocale(location.pathname);
  function remember(value) {
    try {
      localStorage.setItem(key, value);
      localStorage.setItem(visited, '1');
      return localStorage.getItem(visited) === '1';
    } catch { return false; }
  }
  function firstVisit() {
    let seen;
    try { seen = localStorage.getItem(visited); } catch { return; }
    if (seen) return;
    // An explicit language URL always wins over browser preferences.
    const preferred = locale !== 'en' ? locale : detectLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
    if (!remember(preferred)) return; // No durable storage means no repeat redirects.
    if (locale !== 'en' || preferred === 'en') return;
    location.replace('/' + preferred + basePath + location.search + location.hash);
  }
  firstVisit();
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const language = target?.closest('a[data-language]');
    if (language) {
      remember(language.dataset.language);
      // Keep diagnostics, campaign parameters, and the current anchor on a manual switch.
      const url = new URL(language.href, origin);
      url.search = location.search;
      url.hash = location.hash;
      language.href = url.pathname + url.search + url.hash;
    }
    const menu = document.querySelector('[data-language-control]');
    if (target?.closest('[data-language-control] summary')) {
      const mobileMenu = document.querySelector('.mobile-nav');
      if (mobileMenu) mobileMenu.open = false;
    }
    if (menu?.open && !menu.contains(target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    const menu = document.querySelector('[data-language-control]');
    if (event.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  });
  document.addEventListener('focusin', event => {
    const menu = document.querySelector('[data-language-control]');
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  });
}

// The browser receives only route data and the preference handler, not translation catalogs.
export const languageScript = `(${languageBootstrap.toString()})(${JSON.stringify(locales)});`;
