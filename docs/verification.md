# DiskPress website verification

Verified on September 7, 2026. All source edits are inside Website. The application source was read, not modified. This report covers the repository and local Cloudflare build. Publishing uses the existing Git-connected Cloudflare pipeline.

## Delivered

- Release homepage with real Overview, one-time review and results, Locations, Exclusions, and menu bar screenshots
- System, Light, and Dark appearances with a saved browser preference applied before paint
- File optimization, cleaner comparison, native compression and deduplication, one-time work, background monitoring, CLI, and developer information
- Dedicated FAQ, CLI guide, privacy policy, and terms of service
- Mac App Store download links with the supplied attribution parameters unchanged
- App Archiver distinction for applications and executables, with developer and blog links
- Shared Plausible analytics, critical in-head CSS, responsive images, system fonts, metadata, sitemap, robots file, and custom 404

## Automated checks

`npm run check` passed the production build, TypeScript check, and Cloudflare dry run. `npm run test:site` passed for six HTML pages, 133 internal links, nine App Store links, 75 asset references including favicons and responsive image variants, canonical URLs, headings, analytics count, first-paint styling, sitemap, and robots file.

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

## Theme menu styling

The native appearance dropdown was replaced with a site-styled menu that uses the existing surface, border, accent, spacing, and shadow tokens. The trigger visibly says Appearance so its purpose is clear before opening it. System, Light, and Dark remain the only choices. The current mode is checked in the menu and included in the trigger's screen-reader description. Its constant visible label keeps the trigger width stable across selections. The current-setting description and radio state initialize synchronously while the header is parsed. Menu styles remain in the document head.

Local Chrome tests passed all 20 combinations of Light and Dark system appearances, widths of 320, 390, 768, 1024, and 1440 pixels, and 100% and 200% text size. Checks covered arrow keys, Home, End, letter navigation, Enter, Space, Escape, forward and reverse Tab, focus restoration, outside clicks, mobile-navigation interaction, persistence after reload, live system-theme changes, selected-option contrast, 44 pixel targets, and popup containment. Blocked storage and disabled JavaScript were also checked. Desktop and mobile screenshots were visually reviewed in both themes.

The six delayed-final-chunk first-paint cases passed again across all five content routes, including saved and invalid preferences and blocked storage. The new menu was usable before deferred scripts ran. There were zero observed initial layout shifts and no font requests. Analytics was blocked in these tests. The permanent static checks now require the custom trigger, hidden menu, three radio choices, in-head menu styles, and synchronous label initialization.

## Updated app screenshots

All five developer-supplied captures in `../Fastline/generated/screenshots/raw/en-US` are included on the homepage. Overview replaces the previous hero capture. One-time review and results appear together in the workflow section, with Locations and Exclusions beside the control guidance. The existing menu-bar image remains because the new batch has no menu-bar capture. Captions and the FAQ identify screenshot savings as example data. The SSD-write guidance is unchanged, and the example locations do not replace the recommendation to monitor mostly stable folders.

The copied PNGs match the supplied files byte for byte. Image inspection confirmed transparency and the original proportions in every generated WebP variant, with no upscaling. The five new captures generate 23 responsive variants, alongside three variants of the retained menu-bar capture. Only Overview is eager and high priority. The remaining images are lazy-loaded and all have reserved dimensions and descriptive alternative text.

The actual local Cloudflare build was browser-tested at 320, 390, 768, 1024, and 1440 pixels in both Light and Dark appearance. All six screenshots loaded at every tested size. The paired figures aligned on desktop and stacked on mobile without clipped captions, horizontal overflow, or distorted images. Desktop and mobile views were visually reviewed, including rounded transparent corners. A mobile reload preserved the chosen appearance and selected a smaller hero asset. The temporary viewport override and appearance choice were restored after testing.

No page errors were observed. The only console warnings reported that Plausible ignored localhost events. The build and permanent static checks passed again, including the existing first-paint CSS assertions. The new screenshot checks require the six captures, expected dimensions and responsive widths, WebP sources, appropriate loading priorities, descriptive alternative text, and the example-data disclaimer. This screenshot-only follow-up did not repeat the earlier full interaction or delayed-chunk browser suites.

A subsequent sync added the sixth supplied capture, replacing the older menu-bar image with its light-appearance counterpart. The other five source PNGs were unchanged. All six website assets now match the supplied batch. The menu-bar image reserves its new 720 by 1012 pixel proportions and uses 360, 540, and 720 pixel WebP variants without upscaling. Its alternative text describes the scheduled-scan state shown in the new capture. No layout, CSS-loading, or appearance-control behavior changed. The production build, TypeScript check, Cloudflare dry run, static checks, source-file comparisons, and local HTTP check passed. The source and converted image were visually inspected, and transparency and proportions were verified in all three variants. The earlier browser matrix was not repeated for this asset-only sync.

## Favicon compatibility

The favicon compatibility fix preserves the DiskPress SVG artwork and adds a multi-size ICO, 16 and 32 pixel PNGs, and an Apple touch icon. All pages use versioned icon links. macOS image decoding recognized the ICO, and static checks validate its four frames and the PNG dimensions. The previous live site served the SVG but returned 404 for the conventional ICO and touch-icon paths.

## SSD-write guidance

The homepage workflow, FAQ, and CLI guide explain the developer-confirmed write cost of optimization and recommend mostly stable folders. Busy locations, regenerated temporary data, active logs, and download staging folders are discouraged. Recent-file protection is described as a delay, not a way to eliminate writes. CLI examples now target a specific folder of completed data rather than all Documents or Downloads.

The FAQ links to [Kingston's SSD endurance explanation](https://www.kingston.com/unitedkingdom/en/blog/servers-and-data-centers/understanding-ssd-endurance-tbw-dwpd) for the general flash-memory limitation. No SSD lifespan estimate, zero-wear claim, or guaranteed lifespan improvement was added. Regression checks require the warning and FAQ link on the homepage and CLI guide. This content-only follow-up passed the production build, TypeScript check, Cloudflare dry run, static site checks, and a local HTTP response check. It did not repeat the earlier browser test matrix.

## Dependency security

The inherited Astro 5 and Cloudflare adapter dependency tree reported security advisories. The site has no dynamic pages or server features, so the unnecessary server adapter was removed. Astro is pinned to 7.3.1 and Wrangler to 4.129.0. The compatible SVGO security patch is included in the lockfile. The final dependency audit reported zero known vulnerabilities.

Cloudflare still uses the same project name, build command, and deploy command. It now serves the prerendered `dist` directory through Workers Static Assets, without a custom application server or runtime bindings. Node.js 22.12 or later is required. This follows the [Astro static-site guidance](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) and [Cloudflare static-site routing documentation](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

## Release note

The supplied [Mac App Store URL](https://apps.apple.com/app/apple-store/id6800504458?pt=127627850&ct=www&mt=8) returned HTTP 404 again in the final pre-push check. The URL remains unchanged as requested. The listing must become public before the website's download links can work. This is the outstanding release issue, outside the website repository. No price or trial claim was invented.

The earlier external-request timeouts were resolved during the pre-push check. The supplied Plausible endpoint returned HTTP 200 with JavaScript content. An isolated browser loaded that exact live script against the locally built website using the production origin. It generated the expected pageview and outbound App Store click with the supplied attribution URL preserved. Every event request was intercepted before transmission, so no test events were recorded in production analytics. Server-side ingestion was not tested.

Possible savings of up to 50% are based on the developer's supplied product statement and are qualified throughout the website. They are not represented as a benchmark, guarantee, or prediction for an entire disk. Screenshot totals are described as example results.

The legal pages distinguish the offline app from website analytics and infrastructure. The support address is the developer's published address on App Archiver and App Trust Preview. No unsupported hosting-region, fixed retention-period, pricing, or refund guarantee was added.

Signing, notarization, provisioning, translation completeness, and localization checks were outside the scope of this website work.
