# DiskPress website

The release website for DiskPress, built with Astro and deployed through the existing Cloudflare Workers build system.

All pages are prerendered. Cloudflare Workers Static Assets serves `dist` directly, including canonical directory routes and the custom 404 page. The server adapter was removed and Astro and Wrangler were updated to address security advisories in the inherited template. The Cloudflare project name and build/deploy commands are unchanged. Use Node.js 22.12 or later.

## Pages

- `/` introduces DiskPress for Mac, previews DiskPress for Files, and offers a platform-specific download area
- `/ios/` introduces DiskPress for Files for iPhone and iPad, with real screenshots, local-storage limits, and a Mac comparison
- `/faq/` explains capabilities, compatibility, safeguards, savings measurements, and everyday use
- `/cli/` documents the commands, permissions, JSON output, exit codes, and agent workflows
- `/changelog/` lists the DiskPress for Mac release notes, which are preserved as published
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

The shared layout includes the supplied Plausible script once per page. File contents, filenames, local paths, and optimization results are not sent to it. In DiskPress for Mac, a failed application integrity check can open a diagnostic webpage with `utm_source=diskpress` and a numeric `utm_content` value identifying the failed check, including during CLI use. Older Mac app versions used `utm_source` for the same numeric check identifier. These visits are covered by website analytics, not reporting of normal optimization activity. DiskPress for Files has no automatic diagnostic browser visit. The only website preference stored locally is `diskpress-appearance`. Legal pages use the developer support address published on App Archiver and App Trust Preview.

## Commands

- `npm run dev` starts the local development server
- `npm run build` creates the production build
- `npm run check` builds, type-checks, and validates the Cloudflare deployment
- `npm run test:site` verifies the built pages, internal links, assets, metadata, analytics, and pre-paint styling without additional dependencies
- `npm run deploy` deploys to Cloudflare Workers

Development uses Astro's printed local URL. A production-like local preview is available through `npm run preview`. Running a check or local preview does not publish the website. Do not run the deploy command or push Git when only local testing is requested.

`npm run check` includes a Cloudflare dry run, not a deployment. If the environment does not permit Wrangler's default log directory, set `WRANGLER_LOG_PATH` to a writable local log path for that command.

## Release availability

DiskPress for Mac is available from the Mac App Store and Setapp with the same Mac features. The shared `DownloadOptions` component provides both choices in the homepage hero and closing platform section, with equal-width buttons that stack when space is limited. Header, mobile navigation, and footer download links lead to the platform chooser at `/#download`. The Mac hero has its own `/#mac-download` anchor. The FAQ explains the purchase and subscription options, and the CLI guide is explicitly Mac-only. System requirements are linked to the appropriate store. Privacy and licensing disclosures remain separate for each provider.

DiskPress for Files is awaiting App Store approval. `IOS_APP_STORE_AVAILABLE` is independently set to `false`, so the `IosDownload` component displays a non-interactive Available soon status without linking to an unavailable listing. `IOS_APP_STORE_URL` is prepared for app ID 6814957268. After approval is confirmed, switch only the iOS availability flag, rebuild, and verify the CTA, FAQ, and terms. Do not change the Mac availability flag. Do not imply that a Mac purchase, Setapp subscription, or Storage Saver Duo includes the separate iOS product.

The supplied Mac App Store URL is preserved unchanged in `APP_STORE_URL`, including its campaign parameters. `APP_STORE_AVAILABLE` is `true` and controls Mac App Store purchase and recovery links. `SETAPP_URL` preserves the supplied Setapp listing without adding tracking parameters. Provider-specific recovery guidance still directs people to reinstall through their original store. Run `npm run check` and `npm run test:site` before publishing. The site tests check both download options, feature parity wording, links, and recovery guidance. See `docs/verification.md` for the earlier production review.
