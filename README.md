# DiskPress website

The release website for DiskPress, built with Astro and deployed through the existing Cloudflare Workers build system.

All pages are prerendered. Cloudflare Workers Static Assets serves `dist` directly, including canonical directory routes and the custom 404 page. The server adapter was removed and Astro and Wrangler were updated to address security advisories in the inherited template. The Cloudflare project name and build/deploy commands are unchanged. Use Node.js 22.12 or later.

## Pages

- `/` introduces native compression, deduplication, one-time work, background monitoring, the menu bar, and the developer
- `/faq/` explains capabilities, compatibility, safeguards, savings measurements, and everyday use
- `/cli/` documents the commands, permissions, JSON output, exit codes, and agent workflows
- `/privacy-policy/` explains local file processing, diagnostic webpage visits, website analytics, and hosting
- `/terms-of-service/` covers the app license and product-specific responsibilities

App links and developer links live in `src/consts.ts`. FAQ content lives in `src/data/faq.ts`. Product behavior was checked against the local DiskPress source. Commands are documented without running them against user files.

Every visible mention of the developer's name links to the profile URL in `DEVELOPER_URL`. The separate `BLOG_URL` keeps blog links pointing to the Reverse Everything homepage. Both retain the supplied campaign attribution.

## Design and privacy

The site follows the system appearance and offers Light and Dark overrides. A small synchronous head script applies the saved preference before paint. CSS is inlined at build time and the site uses system fonts, with no remote font requests. The sticky header has an opaque background extending above it for Safari safe areas and overscroll.

Appearance and copy controls work without waiting for deferred scripts. The saved appearance label is restored as the header is parsed, and copy-button dimensions stay fixed during feedback. Browser regression checks found no initial layout shifts when the final HTML chunk was delayed. The production static checks reject late stylesheet and font dependencies.

The appearance chooser has a visible Appearance label and a site-styled menu with System, Light, and Dark radio items, rather than a native select popup. The current choice is marked inside the menu and included in the trigger's screen-reader description. It supports arrow keys, Home, End, letter navigation, Enter, Space, Escape, and Tab. It dismisses on outside interaction, restores focus appropriately, and stays within narrow viewports. Its colors, spacing, and selection state use the existing site theme.

Screenshots in `src/assets` are the real images supplied by the developer. Astro generates responsive WebP assets during the build. The favicon uses the application's source artwork and green icon background. No operating-system interface is recreated in HTML or CSS.

The six light-appearance captures from `../Fastline/generated/screenshots/raw/en-US` are copied into `src/assets` for Overview, one-time review, one-time results, Locations, Exclusions, and the menu bar. The original PNG contents and transparency are preserved, and the build creates appropriately sized WebP variants without upscaling. Only the hero loads eagerly. The other screenshots load lazily, with their aspect ratios reserved to prevent layout shifts. Screenshot figures use example data, not promised savings or recommended default locations.

The favicon includes SVG, a multi-size ICO, 16 and 32 pixel PNG fallbacks, and an Apple touch icon. Versioned icon links refresh previously cached browser icons. Run `node scripts/generate-favicons.mjs` after changing `public/favicon.svg`, and update the icon URL version when replacing the artwork.

The shared layout includes the supplied Plausible script once per page. File contents, filenames, local paths, and optimization results are not sent to it. A failed application integrity check can open a diagnostic webpage with a numeric `utm_source` value identifying the failed check, including during CLI use. These visits are covered by website analytics, not reporting of normal optimization activity. The only website preference stored locally is `diskpress-appearance`. Legal pages use the developer support address published on App Archiver and App Trust Preview.

## Commands

- `npm run dev` starts the local development server
- `npm run build` creates the production build
- `npm run check` builds, type-checks, and validates the Cloudflare deployment
- `npm run test:site` verifies the built pages, internal links, assets, metadata, analytics, and pre-paint styling without additional dependencies
- `npm run deploy` deploys to Cloudflare Workers

Development uses Astro's printed local URL. A production-like local preview is available through `npm run preview`. Running a check or local preview does not publish the website. Do not run the deploy command or push Git when only local testing is requested.

`npm run check` includes a Cloudflare dry run, not a deployment. If the environment does not permit Wrangler's default log directory, set `WRANGLER_LOG_PATH` to a writable local log path for that command.

## Release verification note

The supplied Mac App Store URL is wired unchanged throughout the site. It returned HTTP 404 during verification on September 7, 2026. Verify that the listing is publicly available before launch. No price or immediate availability claim is hardcoded on the site.

The final pre-push review passed all local production checks and a fresh dependency audit with zero known vulnerabilities. The Plausible script returned HTTP 200 and passed isolated pageview and outbound-link tests without recording test traffic. The App Store URL still returned HTTP 404, so publishing that listing remains the outstanding release issue. See `docs/verification.md` for the tested scope.
