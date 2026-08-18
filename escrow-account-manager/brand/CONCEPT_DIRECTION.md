# EscrowTrust — Recommended Logo Concepts (Designer's View)

Three directions that fit the product, colors, and Rwanda real-estate escrow context. Give these to your AI as **additional hints** or pick one to refine.

---

## Concept A — "Vault Bridge" (Recommended)

**Mark:** A minimal **arch / bridge** shape (escrow as the middle ground) with a small **shield cutout** at the center. The arch reads as both a **roofline** (property) and a **vault mouth** (secured funds).

**Colors:** Icon in `#2554eb`; check dot or inner glow in `#10b981` (verified).

**Wordmark:** `Escrow` in semibold slate `#334155`, `Trust` in bold `#2554eb` — subtle split, one word.

**Why it works:** Communicates *connection between two parties* and *protected storage* without literal clip art. Scales cleanly to favicon (arch + dot).

```
        ╭───╮
       ╱  ●  ╲      ← emerald verification dot
      ╱───────╲
     EscrowTrust
```

---

## Concept B — "Sealed Document"

**Mark:** Rounded rectangle (document) with a **folded corner**, overlaid by a **circular seal** containing a stylized **E**. Seal ring uses blue; inner check uses emerald.

**Colors:** Document outline `#64748b`; seal `#2554eb`.

**Wordmark:** All-bold "EscrowTrust" in geometric sans; letter-spacing slightly tight.

**Why it works:** Ties to deed verification, AI document scan, and contract checksums — core differentiators. Slightly more "legal tech" than Concept A.

**Caution:** Keep the document shape **abstract** (3–4 lines max) so it doesn't clutter at 16px — at favicon size, use **seal only**.

---

## Concept C — "Dual Node Escrow"

**Mark:** Two small circles (buyer / seller) connected by a **horizontal bar** with a **central lock square** (escrow hub). Lines are 2px, geometric.

**Colors:** Nodes `#94a3b8`; hub `#2554eb`; lock hole `#10b981` when "verified".

**Wordmark:** Single-weight bold "EscrowTrust" with optional subtitle "Secure Escrow" in pill badge (matches current UI).

**Why it works:** Literally models the **three-party escrow model** (buyer — platform — seller). Very SaaS/fintech.

**Caution:** Can feel generic "blockchain network" if over-detailed — keep to 5 shapes total.

---

## Final recommendation

**Start with Concept A (Vault Bridge).** It is the most distinctive at favicon size, avoids document clichés, and pairs well with your existing **blue + emerald** design system in `index.css`.

### Favicon spec (for AI)

- 32×32 viewBox, flat SVG
- Single color `#2554eb` on transparent, OR white icon on `#2554eb` rounded-square app icon
- No text in favicon
- 2–3 paths maximum

### App icon (future PWA)

- 512×512 PNG
- Background: gradient `#2554eb` → `#1d40d8` (subtle)
- White Vault Bridge mark centered with 15% padding

---

## What to iterate with AI

1. Generate 3 concepts × 3 variations = 9 rough options
2. Pick 1 concept; generate favicon + navbar + dark mode together
3. Manually simplify paths (AI logos often have too many nodes for SVG)
4. Test at 16px, 32px, and 120px widths before committing
5. Optional: run a trademark / similar-logo search before finalizing
