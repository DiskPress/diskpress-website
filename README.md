# DiskPress website

The release website for DiskPress, built with Astro and deployed through the existing Cloudflare Workers build system.

All pages are prerendered. Cloudflare Workers Static Assets serves `dist` directly, including canonical directory routes and the custom 404 page. The server adapter was removed and Astro and Wrangler were updated to address security advisories in the inherited template. The Cloudflare project name and build/deploy commands are unchanged. Use Node.js 22.12 or later.

## Pages

- `/` introduces DiskPress for Mac, previews DiskPress for Files, and offers a platform-specific download area
- `/ios/` introduces DiskPress for Files for iPhone and iPad, with real screenshots, local-storage limits, and a Mac comparison
- `/faq/` explains capabilities, compatibility, safeguards, savings measurements, and everyday use
- `/cli/` documents the commands, permissions, JSON output, exit codes, and agent workflows
- `/changelog/` lists Mac and iOS release notes, with original posts preserved as published
- `/support/` offers public GitHub issues and private email support, with guidance on what to include
- `/privacy-policy/` explains local file processing, diagnostic webpage visits, website analytics, and hosting
- `/terms-of-service/` covers the app license and product-specific responsibilities

App links, developer links, and support destinations live in `src/consts.ts`. FAQ content lives in `src/data/faq.ts`. Product behavior was checked against the local DiskPress source. Commands are documented without running them against user files.

Every visible mention of the developer's name links to the profile URL in `DEVELOPER_URL`. The separate `BLOG_URL` keeps blog links pointing to the Reverse Everything homepage. Both retain the supplied campaign attribution.

## Design and privacy

The site follows the system appearance and offers Light and Dark overrides. A small synchronous head script applies the saved preference before paint. CSS is inlined at build time and the site uses system fonts, with no remote font requests. The sticky header has an opaque background extending above it for Safari safe areas and overscroll.

Appearance and copy controls work without waiting for deferred scripts. The saved appearance label is restored as the header is parsed, and copy-button dimensions stay fixed during feedback. Browser regression checks found no initial layout shifts when the final HTML chunk was delayed. The production static checks reject late stylesheet and font dependencies.

The appearance chooser has a visible Appearance label and a site-styled menu with System, Light, and Dark radio items, rather than a native select popup. The current choice is marked inside the menu and included in the trigger's screen-reader description. It supports arrow keys, Home, End, letter navigation, Enter, Space, Escape, and Tab. It dismisses on outside interaction, restores focus appropriately, and stays within narrow viewports. Its colors, spacing, and selection state use the existing site theme.

Screenshots in `src/assets` are the real images supplied by the developer. Astro generates responsive WebP assets during the build. The favicon uses the application's source artwork and green icon background. No operating-system interface is recreated in HTML or CSS.

The six light-appearance captures from `../Fastline/generated/screenshots/raw/en-US` are copied into `src/assets` for Overview, one-time review, one-time results, Locations, Exclusions, and the menu bar. The original PNG contents and transparency are preserved, and the build creates appropriately sized WebP variants without upscaling. Only the hero loads eagerly. The other screenshots load lazily, with their aspect ratios reserved to prevent layout shifts. Screenshot figures use example data, not promised savings or recommended default locations.

Three iPhone captures from `../../DiskPressForFiles/Fastline/fastlane/screenshots/en-US` provide Overview, Review Selection, and Results. Their original 1320 by 2868 PNGs are preserved in `src/assets/diskpress-for-files-*.png`. Astro generates WebP widths of 280, 560, and 840 pixels on the iOS page, plus 240, 480, and 720 pixels for the homepage preview. Only the iOS page hero loads eagerly. No device frames or system interface are recreated in HTML or CSS.

The iOS content was checked against the app README, English metadata, privacy manifest, and local source. The shared core does not imply shared automation features. iOS has no CLI or folder monitoring. A user-started run may continue on iOS 26 or later only when the system permits it. The privacy and terms pages separately cover local iOS records, voluntary report sharing, Apple services, Mac diagnostics, and Setapp reporting.

The favicon includes SVG, a multi-size ICO, 16 and 32 pixel PNG fallbacks, and an Apple touch icon. Versioned icon links refresh previously cached browser icons. Run `node scripts/generate-favicons.mjs` after changing `public/favicon.svg`, and update the icon URL version when replacing the artwork.

The shared layout includes the supplied Plausible script once per page. File contents, filenames, local paths, and optimization results are not sent to it. In DiskPress for Mac, a failed application integrity check can open a diagnostic webpage with `utm_source=diskpress` and a numeric `utm_content` value identifying the failed check, including during CLI use. Older Mac app versions used `utm_source` for the same numeric check identifier. These visits are covered by website analytics, not reporting of normal optimization activity. DiskPress for Files has no automatic diagnostic browser visit. Website preferences are stored locally in `diskpress-appearance`, `diskpress-language`, and `diskpress-language-visited`. Legal pages use the developer support address published on App Archiver and App Trust Preview.

## Languages

English remains at the original URLs. Every page also has Simplified Chinese, Traditional Chinese, German, Mexican Spanish, Spanish from Spain, and Ukrainian variants under `/zh-hans/`, `/zh-hant/`, `/de/`, `/es-mx/`, `/es-es/`, and `/uk/`. This includes CLI, changelog, support, both legal pages, direct-only integrity help, and the 404 page. The 56 public URLs have self-referencing canonicals and reciprocal language alternatives in the head and sitemap. Integrity help and errors remain noindex and absent from the sitemap.

The header's language menu links to the same page in each language, retaining query parameters and anchors when JavaScript is enabled. A synchronous head script matches browser language preferences only on the first visit. An explicit localized URL takes priority. The visited marker is written before redirecting, so returning to English or opening a shared link does not trigger another redirect. Clearing site data resets this behavior. If local storage is unavailable, automatic redirection is disabled and the menu still works. No language-detection request or cookie is used.

English Astro pages are the source of layout and content. `src/middleware.ts` translates the rendered HTML during static prerendering, not in the visitor's browser. Catalogs in `src/i18n/catalog` contain six directly authored translations per message in the order Simplified Chinese, Traditional Chinese, German, Spanish Mexico, Spanish Spain, Ukrainian. Keys are either complete source messages or the first 12 characters of their normalized SHA-256 digest. Numbered placeholders retain inline links, emphasis, and technical tokens. Missing entries, duplicate IDs, and mismatched placeholders fail rather than silently falling back to English. Brand names, command syntax, JSON fields, and original app screenshots remain intact. Copyable prose instructions are translated separately from executable examples.

Keep original changelog posts unchanged. Add their localized wording in the separate changelog catalog. For new or changed content, use `DISKPRESS_EXTRACT_ONLY=1 node scripts/preview-source.mjs` to extract source-message inventories into ignored `.wrangler/qa/localization` files, then add all six translations directly. The extraction and checks do not generate or assess translated wording.

The build hook copies each localized 404 to the locale directory so Cloudflare can serve the nearest matching error page for unknown URLs. Language routes remain static, with the same inline CSS and system fonts as English.

## Commands

- `npm run dev` starts the local development server
- `npm run build` creates the production build
- `npm run check` builds, type-checks, and validates the Cloudflare deployment
- `npm run test:site` verifies the built pages, internal links, assets, metadata, analytics, and pre-paint styling without additional dependencies
- `npm run test:i18n` checks language routing, one-time detection, preference handling, markup preservation, and localized 404 generation with plain JavaScript
- `npm run test:source` checks source-rendered templates, catalog coverage, placeholders, and internal anchors across all 70 page variants without loading native build tools
- `npm run preview:source` runs that source preview locally for layout and interaction review, with analytics removed
- `npm run deploy` deploys to Cloudflare Workers

Development uses Astro's printed local URL. A production-like local preview is available through `npm run preview`. Running a check or local preview does not publish the website. Do not run the deploy command or push Git when only local testing is requested.

When the native build toolchain is not trusted or permitted, use the plain-JavaScript source checks instead. The source preview renders the current templates and CSS with original PNG assets. It is not an Astro build and does not verify generated WebP files, Astro bundling, or Cloudflare deployment output. Do not run native tools or bypass macOS security warnings to complete that fallback check.

`npm run check` includes a Cloudflare dry run, not a deployment. If the environment does not permit Wrangler's default log directory, set `WRANGLER_LOG_PATH` to a writable local log path for that command.

## Release availability

DiskPress for Mac is available from the Mac App Store and as a standalone one-time purchase on Setapp, with the same Mac features. It is not included in a Setapp subscription. The shared `DownloadOptions` component keeps the Mac and iOS App Store buttons primary, with a secondary Setapp text link below them. The buttons have equal widths and stack when space is limited. Header, mobile navigation, and footer download links lead to the platform chooser at `/#download`. The Mac hero has its own `/#mac-download` anchor. The FAQ explains the purchase options, and the CLI guide is explicitly Mac-only. System requirements are linked to the appropriate store. Privacy and licensing disclosures remain separate for each provider.

DiskPress for Files is available on the App Store for iPhone and iPad. `IOS_APP_STORE_AVAILABLE` is independently set to `true`, so `IosDownload` displays download buttons on the homepage and `/ios/`. `IOS_APP_STORE_URL` preserves the approved link for app ID 6814957268, including `pt=127627850`, `ct=www`, and `mt=8`. The site explains the shared Mac compression and deduplication engine, manual operation without automatic monitoring or CLI, and supported local Files locations rather than photo or video optimization. Do not imply that a Mac purchase, Setapp purchase, or Storage Saver Duo includes the separate iOS product.

The supplied Mac App Store URL is preserved unchanged in `APP_STORE_URL`, including its campaign parameters. `APP_STORE_AVAILABLE` is `true` and controls Mac App Store purchase and recovery links. `SETAPP_URL` preserves the supplied Setapp listing without adding tracking parameters. Provider-specific recovery guidance still directs people to reinstall through their original store. Run `npm run check` and `npm run test:site` before publishing. The site tests check both download options, feature parity wording, links, and recovery guidance. See `docs/verification.md` for the earlier production review.
