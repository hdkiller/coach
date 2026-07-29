# Journey Endurance Coaching — Logo & Asset Replacement Guide

> **Status:** Official Journey Endurance Coaching assets have been integrated. The legacy filenames were retained for a zero-code-change deployment, but the files themselves now contain the Journey brand marks.

The following files were replaced with **Journey Endurance Coaching** assets:

## Favicon & PWA Icons

| File                           | Dimensions    | Format | Used In                          |
| ------------------------------ | ------------- | ------ | -------------------------------- |
| `/public/favicon.ico`          | 32×32 / 16×16 | ICO    | Browser tab icon                 |
| `/public/icon.png`             | 512×512       | PNG    | PWA icon, email logo (`logoUrl`) |
| `/public/apple-touch-icon.png` | 180×180       | PNG    | iOS home screen icon             |

## Logo Files (in `/public/media/`)

| File                            | Usage                                                       | Notes                         |
| ------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| `logo.webp`                     | Sidebar collapsed state, mobile header                      | Square logo mark, 80KB        |
| `logo.png`                      | Fallback for logo.webp                                      | 512×512 PNG                   |
| `logo-240.png`                  | Smaller contexts                                            | 240px variant                 |
| `logo_square.png`               | Social sharing, app stores                                  | Square format                 |
| `logo_square.webp`              | WebP variant of square logo                                 |                               |
| `coach_watts_text_cropped.webp` | **Primary wordmark** — sidebar expanded, all layout headers | Horizontal wordmark with text |
| `logo_with_text.png`            | Full logo with text (large)                                 |                               |
| `logo_with_text_2.png`          | Alternate full logo                                         |                               |
| `logo_with_text_cropped.png`    | Cropped variant                                             |                               |
| `logo_with_text_cropped.webp`   | WebP cropped variant                                        |                               |
| `logo_with_text_horizontal.png` | Horizontal layout variant                                   |                               |

## Social Preview / OG Image

| File                          | Dimensions             | Usage                             |
| ----------------------------- | ---------------------- | --------------------------------- |
| `/public/images/og-image.png` | 1200×630 (recommended) | Open Graph / Twitter Card preview |

## File Naming Convention

When replacing these assets, you may either:

1. **Keep the existing filenames** (recommended for zero-code-change swap)
2. **Rename to Journey branding** and update references in:
   - `nuxt.config.ts` (head links)
   - `public/manifest.json` (icon paths)
   - All layout files referencing `/media/coach_watts_text_cropped.webp`
   - All layout files referencing `/media/logo.webp`

## Recommended Asset Specifications

- **Wordmark (text logo):** SVG preferred, with WebP fallback at 2x resolution. Height: 40–48px rendered.
- **Icon mark:** SVG preferred, 512×512 PNG for PWA. Transparent background.
- **Favicon:** Include both `.ico` (multi-resolution) and `.png` (32×32).
- **OG Image:** 1200×630px, PNG or JPG, with brand name + tagline overlay.
- **Color palette:** See `BRANDING.md` for the Journey Green (`#00DC82`) and neutral palette.

## CSS Placeholder

If you need a quick text-based logo before official assets arrive, the layouts already render
the `alt` text ("Journey Endurance Coaching") when images fail to load. You can also use:

```css
/* Temporary text-based brand in sidebar */
.brand-text {
  font-family: 'Public Sans', 'Inter', system-ui, sans-serif;
  font-weight: 900;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
  color: #00dc82;
}
```
