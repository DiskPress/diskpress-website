import type { APIRoute } from 'astro';
import { localeCodes, locales, localePath, publicPaths } from '../i18n/routes.mjs';

export const prerender = true;
export const GET: APIRoute = () => {
  const urls = publicPaths.flatMap(path => localeCodes.map(locale => `<url><loc>https://diskpress.app${localePath(locale, path)}</loc>${localeCodes.map(other => `<xhtml:link rel="alternate" hreflang="${locales[other].lang}" href="https://diskpress.app${localePath(other, path)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="https://diskpress.app${path}"/></url>`)).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
