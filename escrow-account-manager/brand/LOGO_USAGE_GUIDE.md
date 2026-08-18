# EscrowTrust — Logo Usage Guide

Where brand assets live, where they appear in the app, and where they **must not** appear.

---

## Folder structure

```
escrow-account-manager/
├── brand/                          ← Design briefs & source files (this folder)
│   ├── LOGO_AI_BRIEF.md
│   ├── LOGO_USAGE_GUIDE.md
│   ├── CONCEPT_DIRECTION.md
│   └── source/                     ← Original AI exports, Figma exports, working files
│       ├── svg/
│       └── png/
│
└── frontend/public/brand/            ← Runtime assets served by the web app
    ├── logo-primary.svg              ← Navbar, login, landing (icon + wordmark)
    ├── logo-icon.svg               ← Square mark only
    ├── logo-wordmark.svg           ← Text only
    ├── logo-dark.svg               ← For dark backgrounds
    ├── logo-mono-black.svg
    ├── logo-mono-white.svg
    └── favicon.svg                 ← Copy of icon; also symlink/replace /public/favicon.svg
```

**Rule:** Designers work in `brand/source/`. Only **approved, optimized** files go to `frontend/public/brand/`.

---

## Where TO use logos

| Location | Asset | Notes |
|----------|-------|-------|
| **Browser tab** | `favicon.svg` | 16–32px; icon only |
| **Navbar** | `logo-primary.svg` or icon + text | Replace current text-only "EscrowTrust" in `Navbar.jsx` |
| **Login / Register** | `logo-primary.svg` or `logo-icon.svg` + wordmark | Above "Sign in to EscrowTrust" |
| **Landing page hero** | `logo-primary.svg` or large icon | Optional; keep headline readable |
| **Footer** | Small icon or wordmark | `Footer.jsx` |
| **404 / error pages** | Icon | Reassuring, on-brand |
| **PWA / mobile home screen** | `logo-icon.svg` | 512×512 PNG export if you add manifest |
| **Presentation slides** | Full lockup | `PRESENTATION_PPT_CONTENT.md` deck |
| **GitHub README / docs** | `logo-primary.svg` | Project marketing |
| **Email templates (optional)** | Small header icon | If you add HTML email later — keep under 40px height |
| **Admin panel sidebar (optional)** | Icon only | Collapsed nav |

---

## Where NOT to use logos

| Location | Why | What to use instead |
|----------|-----|---------------------|
| **Contract PDFs** | Legal documents need neutral official seals, not marketing branding | Text seal: "OFFICIAL ESCROW SEAL", checksum, issue date (`contractService.js`) |
| **Receipts / invoices / wallet statements** | Financial records should look like accounting documents | Transaction ID, amounts, platform name as **plain text** only |
| **Mutation / deed uploads** | Third-party government documents — never overlay your logo | None |
| **QR verification landing content area** | QR proves document integrity; logo can appear in **page chrome** (navbar) only | Contract hash + verification status in body |
| **Dispute evidence exports** | Evidence must be unmodified | Text metadata only |
| **Audit log CSV exports** | Machine-readable integrity | Filename prefix `EscrowTrust_` is enough |

**Principle:** Logos = **product UI and marketing**. Contracts and receipts = **legal/financial records** with typographic seals, not brand marks.

---

## Implementation checklist (when assets are ready)

- [ ] Copy approved SVGs to `frontend/public/brand/`
- [ ] Copy icon to `frontend/public/favicon.svg`
- [ ] Update `frontend/index.html` `<link rel="icon">` if path changes
- [ ] Update `Navbar.jsx` — `<img src="/brand/logo-primary.svg" alt="EscrowTrust" className="h-8" />`
- [ ] Update `Login.jsx` / `Register.jsx` — centered logo above form
- [ ] Update `LandingPage.jsx` — hero optional logo
- [ ] Update `Footer.jsx` — small mark
- [ ] Add `og:image` meta tag pointing to a 1200×630 PNG export for social sharing
- [ ] **Do not** modify `contractService.js` to embed image logos

---

## Size & spacing rules

| Context | Min height | Max height |
|---------|------------|------------|
| Favicon | 16px | 32px |
| Navbar | 28px | 36px |
| Login hero | 48px | 64px |
| Footer | 20px | 24px |
| Presentation title slide | 80px | 120px |

**Clear space:** Keep at least half the icon height as padding on all sides.

---

## Dark mode

- On `glass` / white navbar: use `logo-primary.svg` (default)
- On `surface-900` / dark panels: use `logo-dark.svg` or `logo-mono-white.svg`
- Never place the full-color blue logo on primary-blue background without a white container

---

## Accessibility

- Always set `alt="EscrowTrust"` on `<img>` logos
- Wordmark in navbar should remain real text OR logo must have accessible alt text
- Ensure contrast ratio ≥ 4.5:1 for any text badge near the logo ("Secure Escrow")
