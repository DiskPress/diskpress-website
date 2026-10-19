// Pure-JavaScript source renderer for structural localization checks and local UI review.
// Not an Astro build. Does not load unsigned native addons or generate responsive images.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from '../node_modules/typescript/lib/typescript.js';
import * as routes from '../src/i18n/routes.mjs';
import { languageScript } from '../src/i18n/browser.mjs';
import { transformHtml, parseHtml } from '../src/i18n/html.mjs';
import catalogs from '../src/i18n/catalogs.mjs';
import { writeLocalizedNotFound } from '../src/i18n/build.mjs';
import { readLocalizedPages } from './check-localized-site.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = file => readFile(path.join(root, file), 'utf8');
const config = await read('src/consts.ts');
const constants = Object.fromEntries([...config.matchAll(/export const (\w+) = ('[^']*'|true|false);/g)].map(([, key, value]) => [key, value === 'true' ? true : value === 'false' ? false : value.slice(1, -1)]));
const faq = { exports: {} };
vm.runInNewContext(ts.transpileModule(await read('src/data/faq.ts'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports: faq.exports, require: () => constants });
const Fragment = Symbol('Fragment');
const h = (type, props, ...children) => ({ type, props: props || {}, children });
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr']);
function render(node) {
  if (node === false || node === true || node == null) return '';
  if (Array.isArray(node)) return node.map(render).join('');
  if (typeof node !== 'object') return esc(node);
  if (typeof node.type === 'function') return render(node.type({ ...node.props, children: node.children }));
  if (node.type === Fragment) return render(node.children);
  const attrs = Object.entries(node.props).flatMap(([key, value]) => {
    if (key === 'set:html' || key === 'children' || key === 'is:inline') return [];
    if (key === 'class:list') { key = 'class'; value = value.flatMap(item => typeof item === 'string' ? [item] : Object.entries(item).filter(([, enabled]) => enabled).map(([name]) => name)).join(' '); }
    return value == null || value === false ? [] : [` ${key}="${esc(value)}"`];
  }).join('');
  const start = `<${node.type}${attrs}>`;
  return voidTags.has(node.type) ? start : `${start}${node.props['set:html'] ?? render(node.children)}</${node.type}>`;
}
let currentPath = '/';
const shared = { ...constants, ...faq.exports, ...routes, languageScript, h, Fragment, URL, Image: props => { const {src,widths,format,quality,children,...rest}=props; return h('img',{...rest,src:'/qa-assets/'+src.file,width:src.width,height:src.height}); } };
async function compile(file) {
  const source = await read(file);
  const match = source.match(/^---\n([\s\S]*?)\n---\s*([\s\S]*)$/);
  assert.ok(match, file + ' frontmatter');
  const [, frontmatter, raw] = match;
  const images = {};
  for (const [, name, imported] of frontmatter.matchAll(/^import (\w+) from '([^']+\.png)';/gm)) {
    const file = path.basename(imported); const bytes = await readFile(path.join(root,'src/assets',file));
    images[name] = { file, width:bytes.readUInt32BE(16), height:bytes.readUInt32BE(20) };
  }
  const rawScripts=[];
  const template=raw.replace(/<!doctype html>/i,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<style([^>]*)>([\s\S]*?)<\/style>/g,(_,attrs,css)=>{
    const index=rawScripts.length;rawScripts.push(css);return `<style${attrs} set:html={rawScripts[${index}]} />`;
  }).replace(/<script\b(?![^>]*\/>)([^>]*)>([\s\S]*?)<\/script>/g,(whole,attrs,code)=>{
    if(attrs.includes('set:html')) return whole;
    const index=rawScripts.length;
    rawScripts.push(attrs.includes('src=') ? '' : ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
    return `<script${attrs} set:html={rawScripts[${index}]} />`;
  }).replace('<slot />','{Astro.props.children}');
  const body=frontmatter.replace(/^import .*;\n?/gm,'');
  const result=ts.transpileModule(`(Astro)=>{${body}\n return <>${template}</>;}`,{fileName:file+'.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,jsxFactory:'h',jsxFragmentFactory:'Fragment'}});
  assert.equal(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file+' syntax');
  const component=vm.runInNewContext(result.outputText,{...shared,...images,rawScripts});
  return props=>component({props:props||{},url:new URL(currentPath,'https://diskpress.app'),site:new URL('https://diskpress.app')});
}
for(const name of ['AppearanceControl','LanguageControl','DownloadLink','DownloadOptions','IosDownload','CodeBlock','FaqList']) shared[name]=await compile(`src/components/${name}.astro`);
shared.SiteLayout=await compile('src/layouts/SiteLayout.astro');
shared.DocumentLayout=await compile('src/layouts/DocumentLayout.astro');
const styles=(await Promise.all(['global','content','ios'].map(name=>read(`src/styles/${name}.css`)))).join('\n');
const pageNames=['index','ios','faq','cli','changelog','support','privacy-policy','terms-of-service','application-corrupted','404'];
const english=new Map(), pages=new Map(), messages=new Map(), groups={};
for(const name of pageNames){
  currentPath=name==='index'?'/':name==='404'?'/404.html':`/${name}/`;
  const component=await compile(`src/pages/${name}.astro`);
  let html='<!doctype html>'+render(component());
  html=html.replace('</head>',`<style>${styles}</style></head>`).replace(/<script\b[^>]*src="https:\/\/analytics\.diskpress\.app\/[^>]*>[\s\S]*?<\/script>/g,'');
  const own=new Map(); transformHtml(html,{collect:own});
  groups[name]=[...own].filter(([id])=>!messages.has(id));
  for(const [id,text]of own) messages.set(id,text);
  english.set(currentPath,html); pages.set(currentPath,html);
  if(process.env.DISKPRESS_EXTRACT_ONLY) continue;
  for(const locale of routes.translatedLocales){
    currentPath=routes.localePath(locale,name==='index'?'/':`/${name}/`);
    let localized='<!doctype html>'+render(component());
    localized=localized.replace('</head>',`<style>${styles}</style></head>`).replace(/<script\b[^>]*src="https:\/\/analytics\.diskpress\.app\/[^>]*>[\s\S]*?<\/script>/g,'');
    localized=transformHtml(localized,{locale,catalog:catalogs[locale]});
    parseHtml(localized);
    pages.set(currentPath,localized);
  }
}
await mkdir(path.join(root,'.wrangler/qa/localization'),{recursive:true});
for(const[name,entries]of Object.entries(groups)) await writeFile(path.join(root,`.wrangler/qa/localization/${name}.json`),JSON.stringify(Object.fromEntries(entries),null,2)+'\n');
console.log('Extracted source messages '+messages.size+' across '+english.size+' pages. '+Object.entries(groups).map(([name,items])=>name+'='+items.length).join(', '));
if(process.env.DISKPRESS_EXTRACT_ONLY) process.exit(0);
for(const[route,html]of pages){
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,route+' heading');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]); assert.equal(ids.length,new Set(ids).size,route+' duplicate IDs');
  for(const[,href]of html.matchAll(/href="((?:\/|#)[^"]*)"/g)){
    const target=new URL(href,'https://diskpress.app'+route);
    if(!routes.allPaths.includes(routes.splitLocale(target.pathname).basePath))continue;
    const dest=pages.get(target.pathname)||pages.get(target.pathname==='/404/'?'/404.html':'');
    assert.ok(dest,route+' missing page '+href);
    if(target.hash)assert.ok(dest.includes('id="'+decodeURIComponent(target.hash.slice(1))+'"'),route+' missing anchor '+href);
  }
}
console.log('Rendered and structurally checked '+pages.size+' pages, including all six locales.');
// Exercise the same localized-page and 404 assertions used on production output.
// Keep this source-rendered fixture separate from dist so it cannot be deployed by mistake.
const fixture = new URL('../.wrangler/qa/localized-site/', import.meta.url);
for (const [route, html] of pages) {
  const file = new URL(route === '/404.html' ? '404.html' : route.slice(1)+'index.html', fixture);
  await mkdir(path.dirname(fileURLToPath(file)), { recursive: true });
  await writeFile(file, html);
}
await writeLocalizedNotFound(fixture);
const localizedPages = await readLocalizedPages(fileURLToPath(fixture));
assert.equal(localizedPages.size,60);
const sitemap = { exports: {} };
vm.runInNewContext(ts.transpileModule(await read('src/pages/sitemap.xml.ts'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports:sitemap.exports,require:()=>routes,Response});
const sitemapXml = await (sitemap.exports.GET()).text();
assert.equal((sitemapXml.match(/<loc>/g)||[]).length,56);
for (const locale of routes.localeCodes) for (const route of routes.publicPaths) assert.ok(sitemapXml.includes('<loc>https://diskpress.app'+routes.localePath(locale,route)+'</loc>'));
assert.ok(!sitemapXml.includes('application-corrupted')&&!sitemapXml.includes('/404'));
console.log('Verified localized metadata, internal language links, hidden-page rules, 404 copies, and all 56 sitemap URLs.');
if(process.env.DISKPRESS_PREVIEW_CHECK_ONLY)process.exit(0);
const types={'.html':'text/html','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(pages.has(pathname)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(pages.get(pathname));return;}
  const base=path.join(root,pathname.startsWith('/qa-assets/')?'src/assets':'public');
  const file=path.resolve(base,pathname.startsWith('/qa-assets/')?pathname.slice(11):'.'+pathname);
  assert.ok(file.startsWith(base+path.sep));
  const bytes=await readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes);
}catch{const locale=routes.splitLocale(new URL(req.url,'http://127.0.0.1').pathname).locale;res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(pages.get(routes.localePath(locale,'/404/'))||pages.get('/404.html'));}}).listen(0,'127.0.0.1',function(){console.log('Preview http://127.0.0.1:'+this.address().port+'/');});
