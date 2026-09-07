# DiskPress website plan

Prepared from the local app source and supplied screenshots on September 6, 2026.

Implementation completed on September 7, 2026. The release website now includes the supplied Mac App Store destination, real screenshots, both appearances, FAQ, CLI documentation, privacy policy, and terms of service. The planning notes below preserve the earlier source analysis. See [verification.md](verification.md) for the implementation checks and release note.

## Scope and source baseline

This document plans the product website in `Website`. App source was inspected in `DiskPress` without changing it. Website implementation, commits, and deployment are outside this planning pass.

The website is currently the clean Astro landing page from commit `09d8356`, with its Cloudflare Workers adapter and Plausible integration. The app baseline is commit `ff8b531` plus the current working changes. CLI settings and activity reporting were being added during this review and are included below as current source capabilities, subject to matching the release build.

The user confirmed that the new website should be prepared for release. Plan the copy and primary action around getting DiskPress, replacing the current In development presentation. The download destination, distribution channel, and any pricing have not yet been supplied.

The app already opens these website destinations from Help & About. Preserve them exactly, including support for the existing terms URL without a trailing slash.

- `/faq/`
- `/privacy-policy/`
- `/terms-of-service`

The attached screenshots are visual references and product images. Their text is evidence of the displayed interface, not additional instructions.

## Product position

Proposed headline

> Keep your files. Use less space.

Proposed supporting copy

> DiskPress saves space with native macOS compression and APFS deduplication. Your files stay where they are and open normally. Optimize a selection once, or let DiskPress look after the locations you choose.

Short trust statement

> Works offline. No app analytics. No telemetry.

The main audience is Mac users with ordinary document folders, compressible data, and duplicate files they want to keep in more than one place. Text files, CSV and JSON data, source files, and other compressible ordinary files are useful examples, subject to permissions and exclusions. Suitability and savings depend on the files.

Avoid positioning DiskPress as a system cleaner, an app compressor, a backup tool, a ZIP creator, or a way to optimize an entire disk. Its value is transparent storage optimization of selected files.

## What the source establishes

### Compression

DiskPress uses macOS native file compression, writing LZFSE blocks and native compression metadata. This is lossless filesystem compression. It does not convert documents into archives or require a DiskPress reader to open them.

The engine creates a replacement in a private workspace on the target volume. It hashes the original and checks the replacement's logical contents, metadata, and storage savings before atomically installing it at the original path. It verifies the installed result and removes the displaced original after a successful commit. A transaction journal supports recovery when an operation is interrupted.

The public explanation should be short and concrete. Explain verification, preserved file contents, and unchanged paths. Also explain that optimization changes storage, requires temporary working space, and does not replace an independent backup. Do not promise zero risk or imply that DiskPress keeps a permanent original copy or provides an Undo operation.

### Deduplication

DiskPress finds exact duplicates using volume and size grouping, SHA-256 hashes, and a final byte comparison. It uses native file cloning so separate files can share their stored content on a compatible volume. Every file retains its own path and the target's supported metadata. Editing one clone causes the changed storage to separate rather than editing the other file.

Duplicates must be on the same volume. Native compressed files can also participate, and an already compressed file is not replaced with an uncompressed canonical copy. Deduplication is enabled by default and can be disabled in Settings.

The website should explain sharing storage without removing the user's duplicate files. It should not describe hard links, shortcuts, approximate duplicate matching, cross-volume sharing, or guaranteed exact gains in free space. Apple's [APFS documentation](https://developer.apple.com/documentation/foundation/about-apple-file-system) provides background on cloning.

### Ways to use DiskPress

| Workflow | Actual behavior | Website treatment |
| --- | --- | --- |
| One-time optimization | Drop or choose files and folders, scan, review, optimize, and see the result | A short three-step explanation using the app's real terminology |
| Saved locations | Remember selected files or folders, inspect their size and savings, enable or disable them, remove them, and reveal them in Finder | Explain that adding a location measures it and does not automatically optimize it |
| Optimize Now | Run a scan, compression, and enabled deduplication over enabled saved locations | Clearly state that it works while automatic monitoring is off |
| Continue in Background | Dismiss the progress presentation while the current service-owned run continues | Distinguish this from enabling scheduled background monitoring |
| Background monitoring | Periodically scan enabled saved locations and optimize eligible files while DiskPress is running | Explain opt-in behavior, scheduling, recent-file protection, and startup |
| Command line | Use the executable already inside the app for inspection, reports, scanning, and optimization | Include a short homepage example and a full command reference |

One-time scans show file counts, sizes, existing compression savings, and eligibility information. They do not predict an exact future compression result. Show Progress can reopen a saved-location run or its completed result. Cancelling work preserves completed optimizations and waits for a safe stopping point.

### Background monitoring and menu bar

Monitoring is off by default. Enabling it requires a saved location and presents an explanation of scheduled work, the menu bar, and automatic startup. Filesystem events record changes, and scheduled scans reconsider eligible files. It is not instantaneous compression on every write.

The default interval is ten minutes, scheduled after the previous automatic cycle finishes. Recent File Protection defaults to one minute for saved-location work, based on creation, modification, and observed file changes. Explicit one-time optimization does not apply that watched-location delay.

The menu bar item appears while monitoring is enabled. Its dashboard shows available space, current savings, optimized file count, recent savings over 24 hours, seven days, and 30 days, and the current state or next scan countdown. Status explains scanning, compressing, deduplicating, battery pause, or a need for attention. The ordinary menu bar artwork is the app's template icon, with state conveyed by the menu dashboard and accessibility description.

The menu exposes Open DiskPress, Add Location, Optimize Now, Stop Monitoring, Settings, and Quit DiskPress. Stop Monitoring also removes the menu bar item and disables automatic startup. Continue in Menu Bar retains monitoring. An explicit Quit DiskPress disables monitoring and startup before exiting, while logout and restart preserve the choice for the next login.

On macOS 13 and later, the app registers itself through the system Login Items mechanism. A login launch stays in the menu bar without opening the main window. Earlier supported systems can monitor while the app is open but do not get this automatic startup registration. The app does not install a separate daemon or privileged helper.

### Performance and control

| Setting | Current behavior |
| --- | --- |
| Low CPU | One active file-work operation with adaptive rests |
| Balanced | Default preset, one active operation with no artificial delay |
| Fast | Up to two active operations within the shared work budget |
| Fastest | Up to four active operations within the shared work budget |
| Power profiles | Optional separate presets for battery and power adapter |
| Battery pause | Optional pause of automatic monitoring on battery, with manual work still available |
| Scan interval | Presets ranging from one minute to 24 hours |
| Recent File Protection | Configurable delay for recently changed files in saved-location runs |
| Compression size range | Configurable minimum and maximum logical file sizes, with a default minimum of 16 KiB |
| Minimum compression savings | Default 1 percent of allocated space, also requiring at least 4 KiB saved |
| Exclusions | File extensions, file groups, wildcard masks, and regular expressions against names or full paths |
| Hidden files | A setting controls discovery of dot files, Finder-hidden files, and system-owned items within permitted locations |
| Notifications | Optional error notifications and protected-file warnings |
| Authorized Paths | Add, remove, inspect, and reveal saved read/write permissions, distinct from saved optimization locations |

Exclusions are used in all optimization workflows. Defaults exclude common compressed archives, disk images, installers, images, audio, and video. Individual directly selected excluded files require an explicit override. Folder descendants keep their exclusions, and no override bypasses mandatory safety restrictions. File-size thresholds apply to compression, not to measuring existing savings or deciding whether identical files can be deduplicated.

The app remembers unsuccessful low-savings attempts using local content hashes and allocation information. Changed contents, allocation, or thresholds cause reevaluation. This is useful efficiency behavior, not a promise that subsequent folder scans perform no work.

### Activity and storage reporting

Activity records compressed, deduplicated, skipped, failed, and recovered results with paths, dates, sizes, savings, durations, and details. The interface can filter results, reveal an item in Finder, and clear Activity.

Current savings describe the latest measured contents of the saved Locations list. This includes disabled locations and native compression or measurable clones that already existed before DiskPress ran. Overlapping locations and repeated identities are counted once. Removing a location removes its current contribution. Measurements may be cached and show their age. Rescan requests a new read-only measurement.

Recent savings describe completed optimizations over rolling 24-hour, seven-day, and 30-day windows. They are separate from current savings and survive clearing Activity. One-time work contributes to recent history even when its folder is not in Locations.

Current deduplication savings are conservative estimates of sharing exposed by macOS metadata. Partial sharing, counterparts outside Locations, and some compressed clone relationships cannot be credited. Catalina can deduplicate but cannot measure current clone savings through the public metadata used here.

Available, free, and reclaimable space describe disk capacity. Reclaimable is macOS-reported reclaimable storage, not a prediction of what DiskPress can save. The chart represents used, reclaimable, and free capacity. Savings are reported separately and are not an extra partition of the physical disk. Overall savings may include multiple volumes while the disk card describes the home volume.

This means the supplied 135 GB figures are interface examples, not evidence that DiskPress newly reclaimed that amount in a benchmark. Use a brief caption stating that shown savings depend on the selected files and measured storage sharing.

### Supported content and limits

Compression requires regular files on a local writable volume that macOS reports as supporting native compression. The engine checks actual capabilities rather than trusting a filesystem name. Present APFS as the primary use case and describe other volumes by capability. Do not promise every HFS+ or external volume will work. Network shares and read-only or unsupported volumes are excluded. Deduplication requires compatible cloning on the same local volume.

The source targets macOS 10.15 on Intel and macOS 11 on Apple Silicon. This is the declared compatibility baseline, not evidence of complete runtime validation on every system. The published requirements should match the actual release. Automatic startup through this app requires macOS 13 or later.

DiskPress deliberately leaves the following outside optimization.

- Application bundles, their contents, and files with any executable permission bit
- Whole home folders, whole disks, broad system roots, system and installed-software trees
- App data and credential locations such as user Library, Applications, and protected configuration directories
- Managed photo, music, and video libraries, supported virtual machine package types, sparse bundles, and backup trees
- Symbolic links, non-regular items, multiple hard links, protected or immutable files, and unsafe metadata cases
- Undownloaded cloud placeholders, which DiskPress does not fetch automatically
- Files that fail access, change-state, native format, or savings checks

Already natively compressed files are skipped by compression but may still be deduplicated. Ordinary user resource forks prevent optimization where their metadata cannot be preserved safely. Empty files provide no useful payload savings.

For a detailed FAQ answer, the maximum compression input is 1 TiB minus 64 KiB under the app's offset-table budget. The stored native compressed representation must also remain below 4 GiB. This is not a universal 4 GiB limit on the original file, and it should not be simplified into an incorrect claim about all large files.

Prominent App Archiver copy

> DiskPress does not compress apps or executable files. Applications require more complex handling, which is implemented in the dedicated App Archiver app. For Mac applications, explore App Archiver.

Link to [App Archiver](https://apparchiver.com/?utm_source=diskpress.app). Its website confirms dedicated application optimization and archiving. Do not imply that it supports arbitrary standalone executables unless that is separately established.

## Proposed page structure

### Main page at `/`

1. A compact header with the real DiskPress icon and links to How it works, FAQ, and Command line. Include a primary Get DiskPress action using the confirmed release destination. Use an official store badge if that is the chosen distribution channel.
2. The headline and supporting copy above, followed by the full main-window screenshot. Put the product benefit and offline privacy statement before implementation terminology.
3. Two concise explanations of compression and deduplication. Explain original bytes and normal access, then storage sharing with every file retained.
4. A three-step workflow showing Choose files, Review the scan, and Optimize. Explain saved locations and Optimize Now alongside the one-time workflow.
5. A dedicated background section with the real menu bar screenshot. Cover automatic scans, the next-scan state, quick actions, and the difference between closing a window and quitting.
6. A compact section on exclusions, performance presets, battery controls, and recent-file protection. Avoid a long feature grid that merely repeats the interface.
7. A storage reporting section describing current and recent savings, with the screenshot figures labeled as examples. Link directly to the relevant FAQ answer.
8. A short terminal example and a link to the full guide. Use a plain code block rather than a fabricated terminal window.
9. A clear scope note for apps and executables with the App Archiver link.
10. A short privacy statement, author attribution, final download action with system requirements, and footer links to FAQ, Privacy Policy, Terms of Service, Ighor July, and More apps.

Preserve the requested author destinations with `utm_source=diskpress.app` on the Reverse Everything homepage and apps directory links.

### FAQ at `/faq/`

Group answers by practical questions, give each answer a stable anchor, and keep the contents readable without JavaScript. Native disclosure elements are suitable if the page becomes long.

| Group | Questions and answer direction |
| --- | --- |
| Everyday use | What does DiskPress do? Do files remain in place? Do I need to extract anything? Does DiskPress need to stay open to read files? |
| Compression and sharing | Is compression lossless? Does deduplication delete one of my copies? What happens when I edit a shared file? Can already compressed files be deduplicated? |
| Getting started | Should I use a one-time run or saved locations? Does Add Location begin optimization? What do Rescan and Optimize Now do differently? |
| Monitoring | Is monitoring on by default? How often does it run? What is Recent File Protection? What does Continue in Background do? What happens when I close the main window, quit, restart, or switch to battery? |
| Menu bar | Why is the icon absent when monitoring is off? What do the status and next-scan countdown mean? How do I stop monitoring or reopen the app? |
| Suitable files | Which folders are appropriate? Why are compressed media and archives excluded by default? Why are apps and executables skipped? Which managed libraries and system locations are excluded? |
| Filesystems | Can I use an external disk? Why does a network or unsupported volume get skipped? Can duplicates on separate volumes share storage? What are the large-file limits? |
| Permissions | Why does the sandbox request a folder? What is the difference between Locations and Authorized Paths? Does a containing-folder grant optimize neighboring files? What happens to a disconnected or unavailable location? |
| Safety | Does DiskPress keep a backup? What does cancellation retain? What happens after interruption? What does Retry Recovery mean? Why should active writes finish and important files have independent backups? |
| Savings | Why are file size and size on disk different? Why can current savings differ from recent savings? Can savings predate DiskPress? Why does free space not increase by the same displayed number? Why are some clone savings unmeasured? |
| Settings and automation | Which performance preset should I choose? Do exclusions apply to direct selections? What do size and savings thresholds control? Can I use Terminal or scripts? |
| Privacy and availability | Does the app use analytics or upload files? What does the website measure? What are the actual release requirements and download options? |

Answers should describe the existing product, including no custom archive format and no dedicated decompress or undo command. If providing instructions to materialize ordinary copies later, verify those instructions separately on the supported macOS version instead of inventing an app feature.

### Command-line guide at `/cli/`

A fifth page is recommended because the interface already exposes useful automation, diagnostic output, and machine-readable reports.

Start with the original bundled executable and permission setup in Settings > Authorized Paths. There is no separately installed CLI. Explicitly explain that terminal commands use saved grants and never open an access picker or request elevated privileges.

| Command | Purpose |
| --- | --- |
| `--help` and `--version` | Inspect usage and the installed version |
| `paths` | List saved read/write authorizations and availability |
| `locations` | List saved optimization locations, state, sizes, and measurements |
| `savings` | Read current and recent savings |
| `overview` | Read savings, disk capacity, and monitoring status |
| `settings` | Inspect optimization settings, performance profiles, and exclusions |
| `activity` | Read retained per-file outcomes with pagination |
| `scan` | Inspect explicit targets without optimizing them |
| `optimize` | Scan and optimize explicit targets using applicable saved settings |

Document `--json`, `--quiet`, `--gui`, `--no-gui`, `--ignore-exclusions`, and `--`. For `activity`, document `--limit N` from 1 to 500 with a default of 50 and `--before ID` using the returned cursor. Explain that `settings` is read-only and is not a command for changing preferences.

Use short, copyable examples such as these. They are documentation examples, not commands executed during this review.

```sh
'/Applications/DiskPress.app/Contents/MacOS/DiskPress' paths --json
'/Applications/DiskPress.app/Contents/MacOS/DiskPress' scan --json -- "$HOME/Documents"
'/Applications/DiskPress.app/Contents/MacOS/DiskPress' optimize --gui -- "$HOME/Documents"
'/Applications/DiskPress.app/Contents/MacOS/DiskPress' overview --json
'/Applications/DiskPress.app/Contents/MacOS/DiskPress' activity --limit 20 --json
```

Explain newline-delimited JSON, final result or error events, progress on stderr in human mode, byte units, null measurements, and timestamps. The exit-code table is 0 for success including safe skips, 1 for failure, 2 for partial results, 64 for usage errors, 75 for an unavailable service or undeliverable result, 77 for authorization errors, and 130 for safe cancellation.

CLI work shares the app's local engine, verification, recovery, and accounting. Scan and optimization jobs run one at a time. Read-only reports can run while optimization is active. A CLI-only host does not enable monitoring or login startup and exits after its jobs. Cancellation through Ctrl+C, SIGTERM, or the optional progress window retains completed changes. A missing final result should lead to checking Activity before retrying.

Do not add undocumented install scripts, daemon commands, standalone compression flags, remote APIs, or a CLI permission-granting feature.

### Privacy Policy at `/privacy-policy/`

Lead with a clear distinction between the application and the website.

| Area | Planned disclosure |
| --- | --- |
| App processing | Files are processed locally. No accounts, app analytics, telemetry, or file uploads are implemented. The privacy manifest declares no collected data and no tracking, and the app has no network client entitlement. |
| Local app records | Describe saved paths and permissions, settings, Activity, savings measurements, recovery information, and content hashes used for verification or efficiency. These stay in the app's local container. |
| Local retention and controls | Explain removal of locations and grants and clearing Activity. The default Activity retention is 1,000 records, recent savings use 31 days of minute totals, and stale low-yield evidence is pruned after 180 days without use. Clearing Activity does not erase all local app state or recent savings. |
| Website measurement | Disclose Plausible page visits, referral and campaign information, coarse device and location statistics, and outbound-link clicks. Describe any actual tagged events by purpose. |
| Hosting | Identify Cloudflare as the website delivery provider and explain that hosting and security can process request information separately from analytics. |
| User-initiated contact and links | Describe information voluntarily sent for support and external websites opened by the user. Apply the destination provider's terms and policy where appropriate. |
| Operator and rights | Provide the confirmed operator, contact route, effective date, relevant rights, and the process for privacy requests or material policy changes. |

Plausible documents aggregate measurement without analytics cookies or persistent visitor identifiers. Its standard handling processes request information transiently rather than storing raw IP addresses in analytics. Keep that claim scoped to analytics, not every hosting log. See the [Plausible data policy](https://plausible.io/data-policy) and [outbound-link documentation](https://plausible.io/docs/outbound-link-click-tracking).

The configured script hostname `analytics.diskpress.app` alone does not establish whether analytics is self-hosted, proxied, or hosted by Plausible, nor its retention, region, or infrastructure logs. Confirm those operational details before publishing specific claims. Cloudflare documents processing visitor request information for customer websites in its [privacy policy](https://www.cloudflare.com/privacypolicy/).

Avoid a blanket claim that the website collects no information. Do not claim an analytics location, retention period, legal exemption, or universal cookie-banner requirement based solely on the script name. The website should remain usable if analytics is blocked.

### Terms of Service at `/terms-of-service/`

Use readable terms specific to a local file utility and its informational website. Include the following topics.

1. The confirmed operator, scope of the agreement, and applicable software license.
2. The user's authority to process selected files and responsibility for choosing appropriate locations and preserving independent backups.
3. What compression and deduplication change, how saved-location monitoring is authorized, and the product's application, executable, and filesystem limits.
4. Variable savings and performance, cached measurements, estimated shared storage, and the absence of a promised number of recovered bytes.
5. Interruption and recovery behavior without promising immunity to concurrent writes, hardware failures, or every form of data loss.
6. Product and website ownership, third-party rights, external links, privacy, support, and changes to availability or compatibility.
7. Purchase, billing, cancellation, and refund provisions only if they apply to the confirmed distribution model.
8. Warranty and liability provisions bounded by applicable law, with mandatory consumer rights preserved.
9. Effective date, changes, termination, severability, and a confirmed contact route.

If distributed through the Mac App Store, align the page with the applicable Apple license and purchase/refund process. Do not invent a paid license, trial, subscription, refund deadline, legal jurisdiction, or support commitment. App Archiver's existing [terms](https://apparchiver.com/terms/) are a useful consistency reference but its app archiving, restore, protected-app, and backup provisions do not describe DiskPress.

## Visual and technical direction

Use the real green DiskPress identity, restrained charcoal surfaces, strong readable type, and a consistent spacing scale. The supplied dark screenshots can sit naturally on these surfaces with their existing alpha channels. All layouts should follow the requested constraints on equal repeated gaps and padding. Internal gaps should not exceed the relevant outer inset.

Use the main screenshot at its natural 1924 by 1662 ratio and the menu screenshot at 812 by 1104. Preserve their real contents and proportions, optimize delivery, provide accurate alt text, and allow access to a readable larger image. Do not recreate macOS controls, windows, menu bars, or terminal chrome in HTML or CSS. Export the actual app icon with its intended background rather than treating the white glyph as a complete icon.

Keep the current Astro and Cloudflare Workers setup. Use a shared layout for head metadata, canonical URLs, navigation, footer, and the existing Plausible script. Pre-render the content pages. Centralize release metadata and outgoing links so release status, download destination, version, requirements, and UTM values stay consistent.

Use system fonts and ensure the stylesheet is included in the head before dependent content can paint. If navigation is sticky, make its background opaque and extend that background through the top safe area and overscroll region. Include accessible focus states, keyboard navigation, sufficient contrast, readable code wrapping, reduced-motion support, and a narrow-screen layout.

Prepare page-specific titles and descriptions, a favicon and social image from actual branding, a sitemap, robots metadata, and a useful 404 page. Keep scripts minimal and render the substantive content without JavaScript. Do not put the internal source-review document under public assets or web routes.

## Publication decisions and source discrepancies

- The user confirmed the new site should be prepared for release. Replace the development message in the planned design. Use the actual download or store destination and confirmed pricing at publication. Do not publish an invented URL, a nonfunctional purchase button, or an unsupported claim that the app is free.
- Confirm the published macOS requirements and release build before advertising historical-version support as tested.
- The current working tree contains newly implemented `settings` and `activity` CLI reporting. Match the guide to the commands included in the release, not only the older command-line document.
- The CLI help says Recent File Protection applies, but `DPCLIOptimizationJob` sends optimization through the one-time service. Its manual compression path does not perform the watched age check, and its deduplication discovery passes no watch rule. Treat the claimed CLI delay as unresolved until source and help agree. The website can accurately describe the confirmed saved-location protection in the meantime.
- The README's exclusions summary is older than the implementation. Current scanner, service, and UI code apply exclusions to one-time work too, with a per-file override. Use the implementation in public guidance.
- Confirm the DiskPress support address and legal operator. `support@apptrust.app` is used publicly by App Archiver, but the DiskPress source does not establish that inbox as its contact.
- Confirm analytics hosting, analytics retention, and relevant hosting logs before finalizing operational privacy details.

These points constrain individual claims and release details. They do not prevent designing the pages or implementing the confirmed product content.

## Implementation sequence and acceptance checks

1. Finalize the benefit statement, page outline, release metadata, and confirmed legal details.
2. Prepare the actual icon and screenshots, then build the shared layout and main page.
3. Add FAQ answers and the CLI guide, keeping claims tied to release behavior.
4. Add Privacy Policy and Terms of Service at the app's existing URLs, with slash handling that works for both variants.
5. Verify rendering at narrow mobile, tablet, and desktop widths. Check readable screenshots, keyboard access, menu behavior, focus, content wrapping, and top safe-area coverage.
6. Verify titles, canonical URLs, structured metadata where appropriate, assets, all internal routes, outgoing URLs, UTM values, and one Plausible integration per page. Confirm analytics failure cannot interrupt navigation.
7. Run the website's production build, TypeScript check, and Cloudflare deployment dry run. Inspect the generated pages and preview the result. Keep app file operations out of website testing.

## Primary local evidence

- [App overview and architecture](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/README.md)
- [Compression, clone verification, and atomic replacement](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPCompressionEngine.mm)
- [Duplicate grouping and canonical selection](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPDeduplicationCoordinator.m)
- [Monitoring and manual work](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPMonitorService.m)
- [Application and menu bar lifecycle](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/App/DPAppDelegate.m)
- [Login registration](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPLoginItemService.m)
- [Settings and default values](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPSharedStore.m)
- [Saved-location savings measurement](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPLocationSavingsScanner.m)
- [Protected path policy](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPOptimizationPathPolicy.m)
- [Application and executable policy](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPApplicationContentPolicy.m)
- [CLI parser and help](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/App/DPCommandLineOptions.m)
- [CLI operation routing](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPCLIOptimizationJob.m)
- [CLI settings and activity output](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/Services/DPCLIStatisticsReporter.m)
- [Existing help destinations](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/Product/UI/DPHelpAboutViewController.m)
- [Privacy manifest](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/PrivacyInfo.xcprivacy)
- [Sandbox entitlements](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/DiskPress/src/DiskPress/DiskPress.entitlements)
- [Existing website page and analytics](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/Website/src/pages/index.astro)
- [Cloudflare deployment configuration](/Users/ighor/DEV/SRC/Tools/AppTrust/DiskPress/Website/wrangler.json)
