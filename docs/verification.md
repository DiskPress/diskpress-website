# DiskPress website verification

Verified on September 7, 2026. All source edits are inside Website. The application source was read, not modified. This report covers the repository and local Cloudflare build. Publishing uses the existing Git-connected Cloudflare pipeline.

## Delivered

- Release homepage with the real Overview and menu bar screenshots
- System, Light, and Dark appearances with a saved browser preference applied before paint
- File optimization, cleaner comparison, native compression and deduplication, one-time work, background monitoring, CLI, and developer information
- Dedicated FAQ, CLI guide, privacy policy, and terms of service
- Mac App Store download links with the supplied attribution parameters unchanged
- App Archiver distinction for applications and executables, with developer and blog links
- Shared Plausible analytics, critical in-head CSS, responsive images, system fonts, metadata, sitemap, robots file, and custom 404

## Automated checks

`npm run check` passed the production build, TypeScript check, and Cloudflare dry run. `npm run test:site` passed for six HTML pages, 128 internal links, nine App Store links, 22 asset references including responsive image variants, canonical URLs, headings, analytics count, first-paint styling, sitemap, and robots file.

Browser checks against the actual local Cloudflare build passed on all five content pages at widths of 320, 390, 768, 1024, and 1440 pixels. Verification covered image loading, light and dark appearances, saved appearance across reloads, system appearance changes, menu navigation and Escape handling, FAQ deep links, command copying, 200% text enlargement, slash redirects, custom 404 behavior, and reading without JavaScript. No page errors or failed local assets were observed. Analytics requests were intercepted during automation to avoid polluting production statistics.

The copy-control test uses an isolated clipboard stub to verify the browser API call and success feedback without overwriting the user's clipboard. The screenshot assets were also inspected visually at desktop and mobile sizes. Temporary browser scripts and screenshots are in the ignored `.wrangler/qa` directory.

## Layout and first-paint review

The follow-up Sites review corrected tablet comparison-card alignment, distributed spacing inside native-feature tiles, and doubled heading spacing in mobile workflow sections. It also relaxed tight heading letter spacing, centered benefit icons beside their text, and improved the comparison copy. Tiles use content-based sizing rather than fixed heights.

The enlarged-text review found additional overflow in long document headings and the narrow header, plus clipped code-block labels. Long text can now wrap, header controls reflow when needed, and code headings accommodate an additional row. All five content pages were checked at 200% text size across six widths from 320 to 1440 pixels.

The appearance selector previously showed System until a deferred script restored a saved choice. Copy buttons also appeared late and increased code-heading heights. Appearance and copy handling now initialize synchronously, the selector restores its label while the header is parsed, and copy controls reserve their final dimensions from the first render. Copy success feedback does not resize the control.

Six first-paint browser cases passed across all five content pages with saved Light, saved Dark, system appearance, an invalid saved value, and blocked browser storage. Holding the final HTML chunk deliberately delayed deferred scripts. Every observed frame had the correct CSS, theme, and appearance label. There were zero observed initial layout shifts and zero font requests. Code-block geometry stayed unchanged before and after deferred scripts, including copy feedback. Tests also confirmed that the sticky header and its overscroll extension paint the same opaque background.

The permanent static checks now inspect the actual production CSS rather than accidentally accepting the small noscript style. They require shared styles in the head, a local font stack, synchronous appearance setup, early selector restoration, and reserved copy controls. They reject late stylesheets, body styles, font imports, and font-face downloads.

The final pre-push review also corrected the selector regression assertion so a missing initialization script cannot pass with an absent-string index. The production build, TypeScript check, Cloudflare dry run, static checks, browser suite, enlarged-text suite, and six first-paint cases all passed again.

Browser automation used local Chrome. This is not a claim of exhaustive testing on every Safari, Firefox, or operating-system version. Analytics was blocked or intercepted during browser tests, so these tests validate resilience and integration behavior, not server-side storage of production analytics events.

## Dependency security

The inherited Astro 5 and Cloudflare adapter dependency tree reported security advisories. The site has no dynamic pages or server features, so the unnecessary server adapter was removed. Astro is pinned to 7.3.1 and Wrangler to 4.129.0. The compatible SVGO security patch is included in the lockfile. The final dependency audit reported zero known vulnerabilities.

Cloudflare still uses the same project name, build command, and deploy command. It now serves the prerendered `dist` directory through Workers Static Assets, without a custom application server or runtime bindings. Node.js 22.12 or later is required. This follows the [Astro static-site guidance](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) and [Cloudflare static-site routing documentation](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

## Release note

The supplied [Mac App Store URL](https://apps.apple.com/app/apple-store/id6800504458?pt=127627850&ct=www&mt=8) returned HTTP 404 again in the final pre-push check. The URL remains unchanged as requested. The listing must become public before the website's download links can work. This is the outstanding release issue, outside the website repository. No price or trial claim was invented.

The earlier external-request timeouts were resolved during the pre-push check. The supplied Plausible endpoint returned HTTP 200 with JavaScript content. An isolated browser loaded that exact live script against the locally built website using the production origin. It generated the expected pageview and outbound App Store click with the supplied attribution URL preserved. Every event request was intercepted before transmission, so no test events were recorded in production analytics. Server-side ingestion was not tested.

Possible savings of up to 50% are based on the developer's supplied product statement and are qualified throughout the website. They are not represented as a benchmark, guarantee, or prediction for an entire disk. Screenshot totals are described as example results.

The legal pages distinguish the offline app from website analytics and infrastructure. The support address is the developer's published address on App Archiver and App Trust Preview. No unsupported hosting-region, fixed retention-period, pricing, or refund guarantee was added.

Signing, notarization, provisioning, translation completeness, and localization checks were outside the scope of this website work.
