import { defineMiddleware } from 'astro:middleware';
import catalogs from './i18n/catalogs.mjs';
import { locales, splitLocale } from './i18n/routes.mjs';
import { transformHtml } from './i18n/html.mjs';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const { locale } = splitLocale(context.url.pathname);
  if (locale === 'en' || !response.headers.get('content-type')?.includes('text/html')) return response;
  const html = transformHtml(await response.text(), { locale, catalog: catalogs[locale] });
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('Content-Language', locales[locale].lang);
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
