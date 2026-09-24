# Recover — Branding Guide

## Brand Feel

Recover serves two distinct user personas, each with a different emotional context — but the same underlying need: **trust at a glance**.

- **Lost item owner / finder**: Someone lands on the Lost page in a panic or as a stranger who just found someone's wallet — the design must read as credible and safe in under two seconds, on both ends. Trustworthy + calm under stress + quietly technical.
- **SME merchant / business operator**: Someone issuing a receipt or reviewing their sales analytics — the design must read as efficient, professional, and businesslike. Clean fintech-grade surfaces, no clutter, every number legible at a glance.

Both contexts share the same design language: **institutional trustworthiness**, not startup flashiness.

---

## Color Palette

| Role | Name | Hex | Use |
|---|---|---|---|
| Primary | Deep Indigo | `#1E2A4A` | Headers, primary buttons, nav, wordmark |
| Primary Light | Indigo 500 | `#3B4C7A` | Hover states, secondary surfaces |
| Accent / Trust | Recover Teal | `#0EA394` | Verified/Active state, links, success |
| Alert / Lost | Warning Yellow | `#D97706` | Lost-status banners, warnings — use as CSS variable `--color-warning`, **never** as Tailwind `amber-*` |
| Critical (rare) | Signal Red | `#E5484D` | Only for destructive actions (delete), never for the Lost status itself |
| Neutral 900 | Ink | `#111318` | Body text |
| Neutral 500 | Slate | `#6B7280` | Secondary text |
| Neutral 100 | Mist | `#F5F6F8` | Page background |
| Neutral 0 | White | `#FFFFFF` | Cards, surfaces |

**Important — amber rule**: The Warning Yellow `#D97706` must be applied as a **CSS custom property** (`--color-warning: #D97706`) or a named design token in the Tailwind config (`warning: { DEFAULT: '#D97706' }`). It must **never** be referenced using Tailwind's built-in `amber-*` utilities (e.g. `text-amber-600`, `bg-amber-100`) anywhere in the codebase — this is prohibited by `AGENTS.md §10`. Use `text-warning` / `bg-warning/10` from the custom token instead.

Rationale: indigo reads as institutional/trustworthy (fintech-adjacent) without being generic blockchain-purple; teal signals "verified/good" distinctly from the warning yellow "lost" state, so color alone communicates status at a glance (with icon + text always paired, never color-only, for accessibility).

### Status Color Mapping (must stay consistent everywhere)
- **Active/Verified** → Teal `#0EA394` + ✅
- **Lost** → Warning Yellow `#D97706` (`--color-warning`) + ⚠️ — **use CSS variable, not amber-\***
- **Recovered** → Teal `#0EA394` + ✅ (same as Active, distinguished by copy: "Recovered on \<date\>")
- **Issued (Receipt)** → Teal `#0EA394` + ✅
- **Voided (Receipt)** → Signal Red `#E5484D` + 🚫

---

## Typography

| Role | Font | Fallback stack | Notes |
|---|---|---|---|
| Headings / display | **Sora** | `Sora, "Space Grotesk", system-ui, sans-serif` | Geometric, slightly technical, confident without being cold. Use 600–700 weight. |
| Body / UI | **Inter** | `Inter, system-ui, -apple-system, sans-serif` | Best-in-class legibility at small sizes, huge language coverage, variable font — good for a public page a stranger reads on a random phone. |
| Monospace (addresses, hashes, IDs) | **JetBrains Mono** | `"JetBrains Mono", ui-monospace, monospace` | For contract addresses, registration IDs, receipt numbers, tx hashes — mono makes long hex strings scannable/diffable. |

All three are open-source (SIL OFL), free via Google Fonts / self-hostable — no licensing cost, fine for a commercial product.

**Type scale (Tailwind-friendly, rem-based):**
- Display: 2.5rem / 700 / Sora — hero, landing headline
- H1: 2rem / 700 / Sora — page titles
- H2: 1.5rem / 600 / Sora — section headers
- H3: 1.125rem / 600 / Sora — card titles
- Body: 1rem / 400 / Inter — default
- Small: 0.875rem / 400 / Inter — meta, captions
- Mono: 0.875rem / 500 / JetBrains Mono — addresses/IDs/receipt numbers

---

## Logo Direction

Icon concept: a **shield outline** (trust/ownership) containing a **location pin** cut from a **QR corner-finder pattern** — communicates "verified physical object, findable" in one mark. Two deliverables provided in `/brand`:
- `logo-icon.svg` — square icon/favicon mark
- `logo-full.svg` — icon + "Recover" wordmark lockup (Sora, 700 weight)

Keep the icon legible at 24×24px (favicon/app icon size) — avoid fine detail that disappears at small sizes; the QR-corner motif is reduced to three simple corner brackets, not a literal scannable QR.

---

## Receipt QR & Sticker Captions

Two distinct QR sticker contexts exist; their captions differ:

| Context | Caption / Label |
|---|---|
| **Item Protection Sticker** | _"This item might be lost. If found, please scan to contact the owner."_ — printed above the QR, Inter font, small size for legibility on physical labels. |
| **Digital Receipt QR** | No sticker caption needed — the QR is embedded in the merchant's branded receipt slip (`RetailReceiptSlip`). The receipt slip header provides the merchant name and branding context. |

---

## Usage Rules

- Minimum clear space around the logo: the height of the shield on all sides.
- On dark backgrounds, use the white/teal variant (invert ink to white, keep teal accent).
- Never recolor the icon to the Warning Yellow color — that color is reserved for status, not brand identity, to avoid confusing "the brand is alarmed" with "this specific item is lost."
- Never use the Amber Tailwind color family (`amber-*`) anywhere in the application — use the `--color-warning` CSS variable or `warning` Tailwind token instead.
- QR sticker caption uses Inter (not Sora) at small sizes for maximum scan-adjacent legibility on a printed label.
- Receipt slip merchant name uses Sora 600–700 for the business name header; Inter 400 for all line-item data.
