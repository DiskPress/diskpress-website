# Social preview

The shared layout uses `public/og.png` for Open Graph and X large-image cards. The card is a 1200 by 630 pixel PNG with generous space around the logo and text. It is separate from the favicon and Apple touch icon. The normal website does not load it as an in-page image.

Each page keeps its own title and description. The image URL uses the configured public site origin and a version query, currently `https://diskpress.app/og.png?v=1`. Increase the version when replacing the artwork. An updated URL can identify a fresh image, but a sharing service may still need to refresh its cached page metadata.

The artwork contains no download, approval, date, or price claims, so it remains usable after release. The site's separate availability setting still controls the page descriptions and download prompts.

## Verification

Run `npm run check` and `npm run test:site`. The site checks cover the actual PNG dimensions and file size, image metadata in the initial HTML head, large-image card selection, alternative text, and page-specific titles and descriptions on all eight pages. The image must remain below 1 MiB.

After publishing, verify that the exact image URL returns HTTP 200 with `Content-Type` set to `image/png`, and that its bytes match the tested asset. Check the live page metadata as well. Platform-specific crop choices and previously cached previews are controlled by the sharing service.

The Open Graph fields follow the [Open Graph protocol](https://ogp.me/), including image type, width, height, and alternative text.

## Artwork provenance

Created with the built-in image-generation tool using the existing DiskPress Apple touch icon as a brand reference. The selected output was 1730 by 909 pixels. It was proportionally resized to fit a 1200 by 630 canvas without cropping, then encoded as an optimized PNG. No app windows or operating-system interface elements were recreated.

## Final generation prompt

```text
Use case ads-marketing.

Create one polished widescreen social-sharing card for DiskPress, an established native macOS app. Generate a new branded card using Image 1 only as the supplied brand reference. Image 1 is the existing DiskPress app icon. Reproduce that icon faithfully as a small fully visible brand mark, preserving its green rounded-square background, white press symbol, exact proportions, colors, and uncropped silhouette. Do not redesign the logo.

Canvas target 2400 by 1260 pixels, approximately 1.905 to 1 landscape aspect ratio, or the closest supported landscape ratio. Design for clear reading at a 1200 by 630 social-preview size and at thumbnail size. Keep every element comfortably within a generous safe area of at least 8 percent from all outer edges. No element may be cropped.

Use a clean premium restrained visual style matching an established native macOS app marketing website. Near-black forest background #111413, off-white text #f3f6f4, crisp green accent #80e69d. Modern crisp sans-serif typography with excellent legibility, careful letter spacing, consistent margins, and spacious composition.

Place a small faithful supplied app icon beside the word "DiskPress" near the upper left. Under it, use a large two-line headline. First line exactly "More room." in off-white. Second line exactly "Same files." in crisp green. Below the headline use the supporting text exactly "Native file compression + deduplication" in clearly readable smaller off-white sans-serif. Place the small exact text "diskpress.app" near the lower left. All text must be perfectly spelled and rendered verbatim, with no extra text or characters.

On the right side, use a restrained elegant abstract stack of translucent green data-like layers becoming compact, with a soft subtle green glow. The layers are abstract material forms, with clean edges and sophisticated dimensional depth, no labels. Keep this visual subordinate to the headline and distinct from the app icon. Balance the text and illustration so the result reads clearly as a widescreen product card with generous negative space.

The only visible text is "DiskPress", "More room.", "Same files.", "Native file compression + deduplication", and "diskpress.app".

No fake app windows, OS chrome, fake screenshots, buttons, App Store badge, release claims, dates, prices, invented statistics, physical computers, busy textures, watermarks, additional logos, or extra text.
```
