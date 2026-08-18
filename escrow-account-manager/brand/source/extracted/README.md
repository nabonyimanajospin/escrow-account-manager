# EscrowTrust — Brand Asset Package

Concept A "Vault Bridge" — full logo system.

## Folder structure

```
svg/            Vector source files (production-preferred, infinitely scalable)
png/            Raster exports at 1x / 2x / 3x, plus favicon + app icon sizes
favicon.ico     Multi-size (16/32/48) favicon for legacy <link rel="icon"> support
```

## File guide

| File | Use |
|---|---|
| `logo-primary` | Main horizontal lockup — navbars, headers, marketing pages (light backgrounds) |
| `logo-icon` | Icon only — square contexts, PWA install prompts, social avatars |
| `logo-wordmark` | Text only — narrow nav bars, footers |
| `logo-dark` | Full lockup pre-set on slate-900 — dark mode headers/footers |
| `logo-mono-black` | Single-color black — print, watermarks, docs |
| `logo-mono-white` | Single-color white — for placing over photos, colored/dark UI surfaces (transparent background, so it won't show on a white canvas — that's expected) |
| `favicon` / `favicon.ico` | Browser tab icon |
| `app-icon-512` | PWA home-screen icon — blue gradient background, white mark, 15% padding |
| `badge-secure-escrow` | "Secure Escrow" pill badge matching UI badge style |

## Implementation notes

- Prefer the `svg/` versions in the actual app (`Navbar.jsx`, `Login.jsx`, `LandingPage.jsx`, etc.) — sharper at every size, smaller file size than PNG.
- Use the `png/` versions only where SVG isn't supported (some email clients, older social share previews, `apple-touch-icon`).
- Wordmark files use `font-family: 'Plus Jakarta Sans', 'Inter', sans-serif` — load one of these fonts on the page or the text will fall back to the system sans and look slightly different from the reference.
- Per your brand rules: do not embed any of these on contract PDFs or payment receipts — those stay text-based official seals.
