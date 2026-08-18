# EscrowTrust — Logo & Brand Identity Brief (for AI Design Tools)

> **How to use:** Copy everything from **"START PROMPT"** through **"END PROMPT"** into your logo AI (Midjourney, DALL·E, Ideogram, Looka, Adobe Firefly, ChatGPT image, etc.). Adjust the last line if you want more concepts or a specific style.

---

## START PROMPT

Design a complete logo and icon system for **EscrowTrust**, a fintech + proptech web platform for **secure real estate escrow** in **Rwanda** (and East Africa). The brand must feel **trustworthy, institutional, modern, and calm** — not flashy crypto, not generic real-estate clipart.

### What the company / product is

EscrowTrust is a **full-stack escrow management platform** that protects high-value property transactions. Buyers and sellers never exchange money directly until legal conditions are met. The platform:

- Runs a **property marketplace** (listings, offers, auctions)
- **Locks buyer funds in escrow** until deed/mutation documents are verified
- Uses **AI document analysis** (OCR + risk scoring) on land titles and mutation certificates
- Integrates with Rwanda’s land ecosystem concepts: **UPI codes**, **Irembo**, **RLMA**, mutation certificates
- Provides **admin KYC**, dispute resolution, double-entry **financial journals**, and **tamper-evident audit logs**
- Generates **verifiable contracts** with SHA-256 checksums and QR codes for public verification
- Sends **tri-channel notifications** (in-app, email, SMS) on every major escrow event
- Uses a **digital wallet** for deposits, releases, and platform fees (buyer 1% + seller 1.5% = 2.5% platform revenue)

**Tagline options (pick one tone, do not cram all into the logo):**
- "Secure Property Transactions"
- "Trust Before Transfer"
- "Protecting buyers, sellers, and land records"

### Brand name semantics

- **Escrow** = neutral third party holding funds until conditions are satisfied (security, fairness, legal process)
- **Trust** = reliability, transparency, auditability, institutional credibility
- The name should read as **one word "EscrowTrust"** in the wordmark (optional subtle split: Escrow + Trust with weight or color difference)

### Target audience

| Audience | What they need to feel |
|----------|------------------------|
| **Property buyers** | My money is safe until I get valid title |
| **Property sellers** | I will be paid when the deal is legitimate |
| **Platform admins / regulators** | Serious, auditable, professional tooling |
| **Students / investors / partners** | Modern African proptech, not a toy demo |

### Brand personality (5 adjectives)

1. **Trustworthy** — bank-grade, not startup-cute  
2. **Secure** — vault, lock, shield, verification (subtle, not aggressive)  
3. **Transparent** — clear processes, open audit trail  
4. **Modern** — clean SaaS UI, not 2010 clipart  
5. **Rwanda-rooted, globally readable** — dignified; avoid clichéd flags or map silhouettes unless extremely abstract  

### Visual direction — DO

- **Primary color:** Tech blue `#2554eb` (trust, finance, technology)
- **Accent color:** Emerald `#10b981` (verified, success, “green light” for approved deeds)
- **Neutrals:** Slate/white surfaces `#f8fafc`, `#0f172a` (premium corporate SaaS)
- **Style:** Flat or semi-flat vector logo; works at **16×16 favicon** and on **hero banners**
- **Motifs to explore (pick 1–2, do not combine all):**
  - Shield + keyhole (protection + controlled release)
  - Stylized house/roof merged with a **vault arc** or **lock ring**
  - Two hands / two parties connected by a **central escrow node** (abstract, geometric)
  - Document with **checkmark seal** + subtle **chain link** (audit trail, not blockchain bro culture)
  - Letter **E** monogram forming a **vault door** or **bridge** between buyer and seller
- **Typography feel:** Geometric sans-serif (Inter, Plus Jakarta, similar) — bold wordmark, excellent kerning
- **Deliverable mindset:** Logo must work on **white**, **slate-900 dark**, and **primary-600 blue** backgrounds

### Visual direction — DO NOT

- No cartoon houses, keys with faces, or dollar-sign eyes
- No overly “Web3/crypto” hexagons, coin stacks, or “to the moon” aesthetics
- No red/gold “luxury real estate” clichés
- No busy gradients that break at small sizes
- No photographic textures in the primary mark
- No Rwanda flag colors as the dominant palette (subtle accent only if any)
- **No logo on simulated legal PDF headers** — legal documents use text seals only (separate from brand mark)

### Required logo variants (design as a cohesive system)

1. **Primary lockup** — icon + "EscrowTrust" wordmark (horizontal)
2. **Icon only / app mark** — square-safe for favicon, PWA, mobile home screen (simple silhouette)
3. **Wordmark only** — for narrow nav bars
4. **Monochrome** — single-color black and single-color white versions
5. **Dark mode variant** — light wordmark on dark backgrounds
6. **Optional:** small "Secure Escrow" badge style (pill) matching existing UI badge

### Technical requirements

- **Vector-first:** SVG preferred; also export PNG @1x, @2x, @3x
- **Clear space:** minimum padding = height of the "E" in the wordmark
- **Minimum size:** icon readable at 16px; full lockup readable at 120px width
- **File naming convention:**
  - `logo-primary.svg`
  - `logo-icon.svg`
  - `logo-wordmark.svg`
  - `logo-dark.svg` (for dark backgrounds)
  - `logo-mono-black.svg` / `logo-mono-white.svg`
  - `favicon.svg` (icon only, optimized)

### Competitive / aesthetic reference (mood, not copy)

Think: **Stripe** clarity + **Plaid** trust + **government portal** seriousness + **modern African fintech** ( dignified ).  
Closer to: institutional escrow / banking SaaS.  
Farther from: Zillow playful branding, Coinbase neon, generic "house with checkmark" stock logos.

### One-sentence brand promise

**EscrowTrust holds money safely, verifies land documents intelligently, and pays out only when the law and both parties agree — with a full audit trail everyone can trust.**

### Output request

Create **3 distinct concept directions** for the icon + wordmark system. For each concept, show: primary lockup on white, icon on primary blue `#2554eb`, and monochrome favicon version. Explain in 2 sentences why each fits EscrowTrust. Prefer **SVG-style flat vector** appearance suitable for a production web app.

## END PROMPT

---

## Quick reference — brand colors (hex)

| Token | Hex | Use |
|-------|-----|-----|
| Primary 600 | `#2554eb` | Buttons, links, brand backgrounds |
| Primary 700 | `#1d40d8` | Hover states |
| Accent 500 | `#10b981` | Success, verified, approved |
| Surface 900 | `#0f172a` | Dark mode text / backgrounds |
| Surface 50 | `#f8fafc` | Page backgrounds |

## After you get logos from AI

1. Save SVG/PNG files into `frontend/public/brand/` (see `LOGO_USAGE_GUIDE.md`)
2. Replace `/favicon.svg` with your icon variant
3. Update `Navbar.jsx`, `Login.jsx`, `LandingPage.jsx` to use `<img src="/brand/logo-primary.svg" />` instead of text-only branding
4. **Do not** embed logos in contract PDFs or payment receipts — those stay text-based official seals
