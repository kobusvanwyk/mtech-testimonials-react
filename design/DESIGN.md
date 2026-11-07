# DESIGN.md: Mtech Testimonials

> Living design record and single source of truth. If any HTML deliverable and this file
> disagree, this file wins and the file is corrected.
> **Mode:** existing-brand (documenting + tightening + reinventing the component layer).
> Live site: https://mtechtestimonials.co.za · App stack: React 19 + Vite 7 + SCSS (NOT Tina4).
> Documentation only: the running app's source is not modified by this work.

## Project
A customer-testimonials management and publishing platform built for **Mannatech South Africa**
(health/wellness supplements). The public site lets associates and customers browse, filter,
download (PDF) and share testimonials; an admin panel handles submission review, approval,
categorisation, CSV/Telegram/WhatsApp imports, and AI duplicate detection. Audience: Mannatech SA
associates and their prospects: health-focused adults, mixed tech-literacy, English + Afrikaans.
Compliance: testimonials follow Mannatech's "Golden Rule", never imply medical cure claims;
public PDFs carry a disclaimer footer.

## Logo
- File: `public/mtech-testimonials-logo.svg` (254×50 viewBox), reference as `<img src="…">`, never inline.
- Standalone-render check: **PASS**: root is `fill="none"` but every path carries an explicit inline
  `fill="#hex"`, so it renders correctly as an `<img>` on light backgrounds.
- Colours extracted:
  - Icon mark (leaf/fins): teal→lime linear gradient: stops `#ABC432` (lime) → `#6CC8CD` (teal-cyan mid) → `#ABC432`, plus solid teal fins `#03B09F`
  - Wordmark "Mtech Testimonials": **grey `#9D9FA2`** (not navy, noted because the brief calls navy an anchor; navy is a *surface* colour here, not a logo colour)
  - "TESTIMONIALS DATABASE" pill: teal `#03B09F` stroke + fill
- Mark type: icon + wordmark lockup
- Geometry: organic (leaf/stroke motif) + humanist-sans wordmark
- Weight: medium
- Iconographic motif: stylised layered leaf / open-book-of-leaves in teal→lime gradient (growth, wellness, nature)
- Square-safe icon mark: **yes**: the leaf mark occupies its own 0 to 52px region, separable from the wordmark → usable for favicon/app icon/social avatar.
- **Dark-ground variant:** RESOLVED: a flat white/mono variant was generated at
  `design/mtech-testimonials-logo-white.svg` by whiting out every fill/stroke and bypassing the leaf
  gradient (the mask's `fill="white"` and root `fill="none"` left intact). Use it on navy/teal grounds
  (footer, hero, email footer). Verified rendering white on navy. The original colour master
  `mtech-testimonials-logo.svg` remains the primary for light grounds. (A full-colour gradient-on-navy
  lockup from the designer would be a nice-to-have, but the white variant covers the functional gap.)

## Favicon Brief
- Icon mark: the teal→lime gradient leaf (separable icon element of the logo lockup)
- Light background: `#ffffff`   ·  Icon colour on light: teal→lime gradient (as-is)
- Dark background: `#1a1a2e` (navy)  ·  Icon colour on dark: teal→lime gradient (reads well on navy) or white fallback
- Format preference: SVG with `@media (prefers-color-scheme: dark)` embedded; PNG + Apple touch icon fallback
- App name: Mtech Testimonials
- theme-color: `#03B09F` (light) · `#1a1a2e` (dark)
- Square-safe mark supplied: yes (leaf mark separable from wordmark)
- RFG package: pending: run tina4-seo (or hand-generate) to produce the full favicon set

## Market Research

### Sector overview
Health/wellness supplement network-marketing (Mannatech is a global MLM in glyconutrient/wellness
supplements). The specific product is a B2B2C SaaS tool for a single distributor org (Mannatech SA) and
its associates: the "customer" is the associate who shares proof, and the "reader" is a health-focused
prospect. Tone must build *credibility and trust* without crossing into medical claims.

### Competitor / analogous landscape
| Brand / analogue | Palette category | Typeface category | Visual register |
|------------------|------------------|-------------------|-----------------|
| Mannatech corporate | Teal/green + white | Humanist sans | Clean, clinical-corporate, trust-led |
| Wellness supplement DTC (e.g. Ritual, Seed) | Soft pastel + one accent | Geometric/humanist sans | Minimal, premium, lots of white space |
| Testimonial/review SaaS (Testimonial.to, Senja) | Bright accent + neutral | Clean sans (Inter-class) | Product-led, card-grid, social-proof-forward |
| Health portals (Healthline, WebMD) | Blue/green + white | Humanist sans | Legible, dense, authority-led |
| Afrikaans/SA wellness brands | Earthy green + warm neutral | Humanist sans | Warm, local, approachable |

### Industry visual conventions
Green/teal = wellness and nature; white/light grounds = clinical trust and hygiene; rounded, soft
forms = approachable and non-threatening; card grids = social proof. Following the convention buys
instant "this is a legit health product" trust; breaking it risks reading as either salesy (MLM
stereotype) or clinical (pharma). The job is to sit in the trustworthy-and-warm middle.

### Design thesis
**The health/wellness sector leans clean, green, and trust-led. Mtech Testimonials should sit on the
warm, human, social-proof side of that: credible like a health brand, but card-first and approachable
like a modern review product, because its whole value is making real people's stories feel genuine, not
clinical and not salesy.**

### Motion personality
**Mtech motion is calm and reassuring: gentle ease-out entrances and smooth state confirmations, nothing
abrupt, bouncy, or decorative.** A testimonial platform trades on trust; motion should feel settled and
honest. Use `--ease-out` and `--ease-in-out` only; never `--ease-spring`. Bias readable durations
(200 to 360ms) over snappy micro-motion.

### Colour direction
Teal is the trust/wellness primary and the logo's dominant hue → `--accent`. Lime is the logo's energy
accent but is low-contrast on white → strictly fills/accents, never body text. Navy is the structural
dark (hero/footer/sidebar/high-impact) and the darkest text. Grounds stay light and airy (`#f5f7fa`
page, white surfaces) to read clean and credible. Warm the neutrals very slightly toward slate-blue so
nothing feels sterile, but keep it predominantly cool: this is a health product, not a lifestyle brand.

### Typography direction
**Unify on Plus Jakarta Sans** (Google Fonts; already bundled in `src/assets/fonts/` for PDF). It is a
humanist geometric sans in the same family of warmth as Avenir LT Pro, but free, self-hostable, and
**renders identically on web and in the react-pdf export**, which resolves the current Avenir-vs-Jakarta
split that was the brief's main typography complaint. One typeface carries both display and body; the
personality difference is created with weight (800/700 display vs 400/500 body), size, and tracking
rather than a second face. This keeps the brand coherent and the font payload small.

### Icon system
- Library: **Lucide**, https://lucide.dev
- Stroke weight in use: 1.5px
- Size tokens: `--icon-xs` 14px · `--icon-sm` 16px · `--icon-md` 20px · `--icon-lg` 24px · `--icon-xl` 32px
- Rationale: already used across the live React app (`lucide-react`), so the guide matches the product
  1:1; its clean humanist 1.5px stroke suits the calm health/wellness tone.
- Integration: production app uses `lucide-react` (unchanged). The `ui-guide.html` shows icons as inline
  `<svg>` (self-contained reference). `currentColor` on every icon; one stroke weight everywhere.

## Design Tokens

### Emphasis & status treatment (§3.6b decision: refined after review)
**No coloured rail anywhere, and no coloured top-line-on-white reflex either** (both read AI-generic).
Each card type instead gets its own identity:
- **Plain content card**: white surface; emphasis from elevation (`--shadow-md` on hover) + type hierarchy only.
- **Featured**: sits on an `--accent-tint` ground with a small leaf mark + teal overline. The accent lives in the surface, not a rail.
- **Stat tile**: inset `--surface-2` ground, uppercase overline label, tabular number: visually distinct from a content card.
- **Status card**: the semantic colour lives in a **tinted header strip** (dot + label on `--[semantic]-tint`), white body below. Colour + label together, never colour alone.
Rationale: the brand is trust-led health/wellness, not an ops dashboard; a left rail reads utilitarian and
a colour-line-on-white reads templated. Giving each type its own ground/treatment makes the set feel
designed rather than generated. Updated 2026-10-10 after the Gate B review flagged the top-band cards as generic.

### Colour: light theme
| Token | Hex | Role |
|-------|-----|------|
| `--accent` | `#03B09F` | Brand teal. Fills under dark text, top accent band, tints, focus ring, logo echo, chart fills. Also the primary-button fill with white text, by human override (2.7:1, see below). |
| `--accent-ink` | `#027268` | Interactive teal: teal links/text on white (5.8:1 ✓), outline-button resting text, condition chips. Primary buttons use bright `--accent` instead (human override, see below). |
| `--accent-hover` | `#028a7c` | Button/link hover (darkened teal). |
| `--accent-active` | `#015f56` | Pressed/active (further darkened). |
| `--accent-tint` | `#e6f8f6` | Subtle teal background: selected rows, highlights, alert ground. |
| `--accent-mid` | `#b3ede8` | Stronger teal tint: dividers on tint, hover on tinted surfaces. |
| `--secondary` | `#ACC42A` | Brand lime. **Fills/accents ONLY** (1.97:1 on white, never body text). Dark text on lime = 8.7:1 ✓. |
| `--secondary-ink` | `#6b7d13` | Lime-as-text when unavoidable (4.6:1 ✓ on white). Prefer `--secondary` as a fill with dark text instead. |
| `--secondary-tint` | `#f6faea` | Subtle lime background: product tag chips, accents. |
| `--dark` | `#1a1a2e` | Navy: hero/footer/sidebar surfaces, high-impact panels. |
| `--dark-2` | `#2a2a4a` | Navy mid. |
| `--dark-3` | `#3a3a5a` | Navy light. |
| `--bg` | `#f5f7fa` | Page background (cool slate-tinted near-white). |
| `--surface` | `#ffffff` | Cards, panels, modals, inputs. |
| `--surface-2` | `#f8fafc` | Inset/elevated secondary surfaces; table striping; sidebar panels. |
| `--border` | `#e2e8f0` | Dividers, default input borders. |
| `--border-strong` | `#cbd5e1` | Focused/active separators, hovered input borders. |
| `--text-1` | `#1e293b` | Headings + high-emphasis body (14.6:1 on white ✓). |
| `--text-2` | `#475569` | Body copy, labels (7.6:1 on white ✓). |
| `--text-3` | `#64748b` | Captions, placeholders, metadata (4.8:1 on white ✓; 4.4:1 on `--bg`: AA large/UI, reserve for non-essential meta). |

### Colour: dark theme (independently tuned, not inverted)
| Token | Hex | Notes |
|-------|-----|-------|
| `--bg` | `#0f1222` | Deep navy-black page ground. |
| `--surface` | `#1a1a2e` | Navy card/panel (reuses the brand navy). |
| `--surface-2` | `#23233f` | Elevated/inset surface. |
| `--border` | `#30304d` | Dividers on dark. |
| `--border-strong` | `#44446b` | Active separators on dark. |
| `--text-1` | `#e8ecf3` | Headings (15.7:1 on bg ✓). |
| `--text-2` | `#b4bdd0` | Body (9.9:1 ✓). |
| `--text-3` | `#8591ab` | Meta (5.9:1 ✓). |
| `--accent` | `#2ec9b8` | Brand teal brightened for dark ground (links/text 8.3:1 on surface ✓). |
| `--accent-ink` | `#2ec9b8` | Teal text/links on dark. |
| `--accent-tint` | `#113b38` | Teal ground on dark (selected rows/alerts). |
| `--accent-button-text` | `#0f1222` | Dark-mode primary button = teal fill `#2ec9b8` + navy text (white-on-teal fails on dark). |
| `--secondary` | `#c3dd3f` | Lime brightened for dark (12.2:1, still fills/accents). |

### Semantic colours (distinct from brand; green shifted bluer than lime so "approved" never reads as a brand flourish)
| Role | Token (text/icon) | Fill | Tint | Light notes |
|------|-------------------|------|------|-------------|
| Success | `--success` `#4e7d1a` | `#7CC42A` | `--success-tint` `#f0f8e0` | 4.9:1 on white ✓ |
| Warning | `--warning` `#a85e10` | `#FFAF4E` | `--warning-tint` `#fff4e0` | 4.9:1 white / 4.5:1 tint ✓ |
| Error   | `--error` `#c40f24` | `#E7142C` | `--error-tint` `#fde8eb` | 6.1:1 white; white-on-`#c40f24` = 6.1:1 ✓ for destructive buttons |
| Info    | `--info` `#1f6a8c` | `#5BC2E7` | `--info-tint` `#e8f7fc` | 6.0:1 white / 5.5:1 tint ✓ |

Each has `-hover` (≈10% darker) and `-active` (≈20% darker) tokens: hover/active never hardcode hex.
Dark-theme semantics brighten the text tokens (success `#8fd14f`, warning `#f0a84e`, error `#f06a78`,
info `#5bc2e7`) against dark tints; recorded in the ui-guide `:root[data-theme="dark"]` block.

### Typography (single face: Plus Jakarta Sans; weights 400/500/600/700/800)
| Role | Token | Weight | clamp() value | Tracking / line-height |
|------|-------|--------|---------------|------------------------|
| Display | `--text-display` | 800 | `clamp(2.5rem, 1.9rem + 3vw, 4rem)` | −0.03em / 1.02 |
| H1 | `--text-h1` | 700 | `clamp(1.9rem, 1.5rem + 2vw, 3rem)` | −0.02em / 1.1 |
| H2 | `--text-h2` | 700 | `clamp(1.4rem, 1.15rem + 1.2vw, 2.1rem)` | −0.01em / 1.2 |
| H3 | `--text-h3` | 600 | `clamp(1.1rem, 0.95rem + 0.6vw, 1.45rem)` | default / 1.3 |
| Overline | `--text-overline` | 600 | `clamp(0.68rem, 0.64rem + 0.2vw, 0.76rem)` | +0.09em, uppercase / 1.4 |
| Body Large | `--text-body-lg` | 400 | `clamp(1.05rem, 1rem + 0.25vw, 1.15rem)` | default / 1.65 |
| Body | `--text-body` | 400 | `clamp(0.92rem, 0.88rem + 0.2vw, 1rem)` | default / 1.6 |
| Caption | `--text-caption` | 400 | `clamp(0.74rem, 0.72rem + 0.1vw, 0.82rem)` | +0.01em / 1.5 |
| Code / Mono | `--text-code` | 400 | `clamp(0.78rem, 0.75rem + 0.12vw, 0.86rem)` | default / 1.6 |

Viewport anchors: min 320px · max 1280px. Fallback stack: `'Plus Jakarta Sans', 'Segoe UI', 'Avenir Next', system-ui, sans-serif`.
Mono: system stack `ui-monospace, 'SFMono-Regular', 'Cascadia Code', Menlo, Consolas, monospace` (no third webfont: identifiers are rare in this product). Body text columns `max-width: 65ch`.

### Form tokens (aliases, not new colours)
| Token | Alias of |
|-------|---------|
| `--label-color` | `--text-2` |
| `--label-color-focused` | `--accent-ink` |
| `--label-color-error` | `--error` |
| `--label-color-disabled` | `--text-3` |
| `--input-bg` | `--surface` |
| `--input-bg-disabled` | `--surface-2` |
| `--input-border` | `--border` |
| `--input-border-hover` | `--border-strong` |
| `--input-border-focused` | `--accent-ink` |
| `--input-border-error` | `--error` |
| `--placeholder-color` | `--text-3` |
| `--helper-color` | `--text-3` |
| `--helper-color-error` | `--error` |

### Interaction tokens
| Token | Value |
|-------|-------|
| `--focus-ring` | `0 0 0 2px var(--surface), 0 0 0 4px var(--accent-ink)`: a 2px gap in the surface colour, then a solid 2px teal ring (strengthened 2026-11-04; the old pale halo was hard to see when navigating by keyboard) |
| `--focus-ring-dark` | `0 0 0 2px var(--dark), 0 0 0 4px var(--accent)`: the same ring for navy grounds (admin sidebar, drawers, login, public footer), using bright teal so it reads on navy |
| `--focus-ring-offset` | 2px |
| `--disabled-opacity` | 0.45 |
| `--hover-tint` | `rgba(3,176,159,0.07)` (teal at ~7%) |

### Animation tokens
| Token | Value |
|-------|-------|
| `--duration-fast` | 120ms |
| `--duration-base` | 220ms |
| `--duration-slow` | 360ms |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
(No `--ease-spring`: motion personality is calm/non-decorative.) Wrapped in `prefers-reduced-motion`.

### Breakpoints (adopted from the app, 2026-11-04)
The guide follows the app's SCSS mixins rather than its own earlier 640 / 768 split.
| Name | Range | Notes |
|------|-------|-------|
| Mobile | below 576px | Single column, bottom-sheet drawers, full-screen modals, stepper labels hidden |
| Large phone | 576 to 767px | Two-column grids where sensible |
| Tablet | 768 to 959px | Admin shell still uses its drawer |
| Desktop | 960 to 1199px | Admin sidebar fixed at 240px |
| Wide | 1200px and up | Content capped at the wide width; card grids 3 to 4 columns |

### Z-index scale
base 1 · dropdown 100 · sticky 200 · topbar 300 · drawer 400 · modal-backdrop 500 · modal 600 · toast 700 · tooltip 800

### Spacing scale (base-4)
4 · 8 · 12 · 16 · **20** · 24 · 32 · 40 · 48 · 64 · 80 · 96 px (`--space-5: 20px` defined)

### Layout width tokens
`--max-prose: 65ch` · `--max-content: 720px` · `--max-wide: 1200px`

### Border radius (retains the brand's pill-CTA convention: an existing anchor)
`--radius-sm: 6px` (tags/chips) · `--radius-md: 8px` (inputs/buttons default) · `--radius-lg: 12px` (cards/panels) · `--radius-xl: 16px` (modals/large containers) · `--radius-pill: 28px` (pill CTAs: brand signature) · `--radius-full: 999px` (badges/avatars/toggles)

### Shadows (hue-tinted toward slate-navy, not pure black)
- `--shadow-sm`: `0 1px 2px rgba(30,41,59,0.06), 0 2px 8px rgba(30,41,59,0.05)`
- `--shadow-md`: `0 4px 16px rgba(30,41,59,0.08)`
- `--shadow-lg`: `0 12px 32px rgba(30,41,59,0.12)`
- Dark-theme: `--shadow-sm/md/lg` switch to `rgba(0,0,0,0.3)` / `rgba(0,0,0,0.4)` (warm tint vanishes on dark ground).

### Contrast pairs (verified: see computed ratios)
| Text | Background | Ratio | Pass? |
|------|-----------|-------|-------|
| `--text-1` #1e293b | `--bg` #f5f7fa | 13.6:1 | ✓ body |
| `--text-1` #1e293b | `--surface` #fff | 14.6:1 | ✓ body |
| `--text-2` #475569 | `--bg` #f5f7fa | 7.1:1 | ✓ body |
| `--text-3` #64748b | `--surface` #fff | 4.8:1 | ✓ body |
| `--text-3` #64748b | `--bg` #f5f7fa | 4.4:1 | ✓ large/UI (meta only) |
| `--accent` #03B09F text | #fff | 2.7:1 | ✗ → use `--accent-ink` #027268 (5.8:1 ✓) |
| white | `--accent` #03B09F | 2.7:1 | ✗ for AA, kept on primary buttons by human override (see below) |
| `--secondary` #ACC42A text | #fff | 2.0:1 | ✗ fills only → `--secondary-ink` #6b7d13 (4.6:1 ✓) for text |
| navy #1a1a2e | lime `#ACC42A` fill | 8.7:1 | ✓ (dark label on lime chip) |
| `--success` #4e7d1a | #fff | 4.9:1 | ✓ |
| `--warning` #a85e10 | #fff | 4.9:1 | ✓ |
| `--error` #c40f24 | #fff | 6.1:1 | ✓ |
| `--info` #1f6a8c | #fff | 6.0:1 | ✓ |
| dark `--text-1` #e8ecf3 | dark `--bg` #0f1222 | 15.7:1 | ✓ |
| dark `--accent` #2ec9b8 | dark `--surface` #1a1a2e | 8.3:1 | ✓ |

**Flagged brand-colour fixes (announced, not silent):**
- Brand teal `#03B09F` cannot carry white text → interactive teal uses `--accent-ink #027268`. The bright
  brand teal is preserved everywhere it passes (fills with dark text, accent band, tints, focus ring).
  **HUMAN OVERRIDE (2026-10-11):** the developer made a deliberate brand call to keep the bright brand
  teal `#03B09F` on **primary/CTA buttons with white text** (Search, Continue/Submit, Load more, the
  announcement band, filter chips, outline-button hover fills), accepting the 2.7:1 contrast rather than
  the AA-passing `--accent-ink`. `--accent-ink` is retained only for teal **text on light grounds** (links,
  labels, outline-button resting text, condition chips). Recorded so the override is explicit, not drift.
- Brand lime `#ACC42A` cannot be text on white → fills/accents only; `--secondary-ink #6b7d13` for the
  rare text case. Lime chips carry navy/dark text (8.7:1).

## Tables (added 2026-11-04)
Specced in `ui-guide.html` under Tables, with resizable previews. Measured on the live app first: All Testimonials rendered all 286 rows at once (a page about 54,000px tall), rows averaged 187px and reached 684px (16 conditions in one row), the table needed about 1,235px so it scrolled sideways even on desktop, and on a phone it forced the whole admin to zoom out.
- **No sideways scrolling, ever.** Tables respond to their container width with container queries (`container-type: inline-size`), not the window, so they behave the same beside the sidebar or full width. Below a table's minimum width rows become cards or stacked rows.
- **All Testimonials:** a fixed-layout table from 840px (select 44px, title flexible, conditions and products 25%, status 144px, actions 236px), cards below. The title carries one meta line (author, date, image count, import source) in place of three columns. Conditions (teal) and products (lime) share one column capped at 3 chips plus a +n popover grouped by type; long names truncate with an ellipsis. Edit and Publish or Unpublish stay visible; View public page, Flag, Download PDF and Delete (last, red, after a divider) live in More. Bulk bar on selection, status tabs (a select in card layout), search, sort, Comfortable (default) or Compact density, 50 rows per page.
- **Image Manager list:** table from 760px with fixed layout. The linked testimonial leads; the timestamp file name is a muted, truncated second line. Orphans keep the amber tint and read "Not used". Narrow: one compact row per image, every action in More.
- **Import preview:** table from 820px, cards below. A summary (rows checked, ready, to check, errors) with "Import n as Pending". Rows to check tint amber and rows to be skipped tint red, each with a plain message. Expandable rows show the story and every tag.
- **Text tables (Privacy):** a table from 600px; below that each row stacks into a heading with labelled values.
- **Semantics:** explicit table, row, columnheader and cell roles so the table survives card restyling. Overlays (chip popovers, More menus) are never clipped: table containers stay `overflow: visible`.

## App shell (added 2026-11-04)
Specced in `ui-guide.html` under App shell, from the brief in `plan/app-shell-brief.md`.
- **Frame:** fixed 240px navy sidebar from 960px, plus a 56px sticky top bar (`--z-topbar`). Content sits on `--bg`, not `--surface-hover`. Below 960px the sidebar becomes a slide-over drawer from the left (`--z-drawer`) behind a hamburger.
- **Top bar: adopted.** Left, a breadcrumb for context (pages keep their own H1). Right, the Private mode pill (only while the site is private), an Ask AI entry that opens the Ask AI page, and an avatar account menu (View public site, How-to guide, Log out). The account actions leave the sidebar, so it has no footer. Below 576px the top bar trims to hamburger, page name, the Private mode lock icon and the avatar.
- **Sidebar:** the white logo with an Admin tag replaces the "MTech Admin" text. Four labelled groups: Testimonials (Dashboard, All Testimonials, Pending Review, Ask AI), Library (Categories, Image Manager), Import (Import CSV, WhatsApp Sync, Duplicate Scanner), Settings (Settings, PDF Settings). Pending Review joins the nav with an amber count pill, hidden at 0. All icons are Lucide at 1.5px, including WhatsApp Sync (plain message icon); the green WhatsApp mark is kept for share buttons.
- **Nav states, no rail:** default text `#b4bdd0` with `#8591ab` icons; hover a 6% white ground; active a teal tint ground (`rgba(3,176,159,.18)`), white 700-weight text and a bright `--accent` icon, with `aria-current="page"`; focus `--focus-ring-dark`. Rows are 44px with `--radius-md` (nav rows, not buttons, so the pill rule does not apply).
- **Active rule:** an item is active on its own route or any child route (`/admin/edit/:id` lights up All Testimonials; the Dashboard link must match `/admin/dashboard`). Found live on 2026-11-04: the link points to `/admin` while the app lands on `/admin/dashboard`, so nothing is lit on the landing page. Point it at `/admin/dashboard` and redirect `/admin` there.
- **Sidebar height:** fixed to the viewport with its own scroll (`overflow-y: auto`). Found live on 2026-11-04: the current sidebar is fixed with no scroll, so at 1280 × 640 View Site and Logout end 118px below the screen and cannot be reached. The account actions move to the top bar, so there is no footer to push off.
- **Mobile model:** hamburger plus drawer, no bottom tab bar (eleven destinations do not fit four slots, and a fixed bar fights tables and toasts). The drawer moves focus inside, traps Tab, closes on Escape, backdrop or choosing a page, and returns focus to the hamburger. No collapsed icon rail for now.
- **Login:** navy ground (`--shell-ground`, deeper navy in dark mode), white logo above a single card, standard fields with a password show/hide toggle, a bright teal pill Sign in, and a "Back to the public site" link.
- **Public navbar:** announcement bar, white navbar with the colour logo and the teal-to-lime line. View by Condition / Product are **searchable menus**: a filter field, A to Z groups with counts, highlighted matches, arrow keys and Escape. On mobile the menus move into a right-hand drawer whose rows open the full browse lists.
- **Public footer:** navy, gradient band, white logo and tagline, Explore and Legal links, the supplements disclaimer, copyright line. Stacks to one column below 768px.
- **Accessibility:** "Skip to content" link first on every page, `nav` and `main` landmarks, the strengthened focus rings above.

## Product-specific components (Phase 3 §3.0: confirmed)
Built as a **Product** group in ui-guide, all on the same tokens:
1. Testimonial card (public grid: quote, attributer, condition + product tag chips, share/download)
2. Filterable category sidebar + mobile bottom sheet
3. Search bar (with clear button + suggestions)
4. Review-status badge set (admin: Pending / Approved / Rejected / Published / Imported)
5. Submit stepper (7-step submission flow)
6. Duplicate-match result card (side-by-side with "keep this copy" recommendation)
7. Import/source chips (CSV / Telegram / WhatsApp)
8. Branded A4 PDF export preview card (logo header, teal accent, contact footer, legal disclaimer)
9. Image-manager tile (from existing ImageManager surface)
10. Admin KPI stat tiles (Dashboard)

### Extended product components (added 2026-10-10 from developer screenshots of real admin + public surfaces)
11. Ranked bar chart: dashboard Top Conditions (teal) / Top Products (lime)
12. Tabs with count badges: All Testimonials status filter (All 356 · Pending 0 …)
13. Content list row: Recent Submissions / "More like this" (title · meta · status · action)
14. Filter KPI tiles: Image Manager counters that filter on click (selected = warning accent)
15. Rich-text editor: B/I/list toolbar + live word/char count (Edit Testimonial)
16. Multi-select tag grid: conditions/products checkable two-column selector (Edit/Submit)
17. Activity timeline: edit-history status changes on a vertical track
18. Outline chip variant: teal-outline conditions / lime-outline products (dense lists); filled tint stays default
19. Photo gallery + lightbox: before/after thumbnail strip, click to enlarge
20. Share bar: Share on WhatsApp (#25D366) + Copy link with feedback
21. Segmented view switcher + sort: Image Manager grid/list toggle
22. Rich image tile: selectable, Gallery/Orphan badge, action row, "Not used" status
23. Management list row: Categories item: name + count + Rename/Delete
24. Merge / dedupe picker: "possible duplicate, keep which?" radio + Merge/dismiss (Categories)
25. Instruction steps callout: numbered how-to panel with teal accent (WhatsApp export)
26. Announcement CTA bar + title-first testimonial card variant (public home/search grid)
27. Ask AI search (added 2026-10-11): natural-language testimonial search with three states (prompt + example chips · cancellable searching with relevance progress · results with a teal AI-summary banner and per-result AI insight line). Sparkle mark signals AI; teal accent ties it to brand. Maps to the live Ask AI feature (relevance-pass pipeline + Stop button).

## App mockup (app.html: Phase 6)
Built as a product mockup, then **removed at the developer's request** (2026-10-10): the UI will be
applied directly to the existing React surfaces in a separate dev session rather than from a mockup.
`ui-guide.html` remains the component spec and `brand-guidelines.html` the brand reference.

## Next Steps
- SEO/AISO implementation: run tina4-seo (reads this file). NOTE: not a Tina4 app: use the favicon brief + token values directly in the React/Vite project; skip tina4-css mapping (project uses its own `--`-prefixed SCSS tokens, no `tina4.min.css`).
- WCAG 2.1 AA audit: run tina4-a11y (reads this file) after any implementation.
- Developer implementation: read `design/ui-guide.html` + `design/brand-guidelines.html` as the spec. Apply the reconciled tokens to `src/styles/_tokens.scss` in a separately-scoped change, NOT part of this design pass.
- Marketing-site re-anchor: n/a (single product, brief is authoritative).

## Rationale log
- 2026-10-10: Unify typography on Plus Jakarta Sans (web + PDF), resolves the Avenir/Jakarta split; already bundled; renders identically in react-pdf; one coherent brand face.
- 2026-10-10: Lucide icons, matches live app, calm 1.5px stroke fits wellness tone.
- 2026-10-10: Full dark theme designed independently, future-proofs the product; navy surfaces retained.
- 2026-10-10: Interactive teal = `#027268` (`--accent-ink`), brand teal `#03B09F` reserved for fills/accents, fixes white-text-on-teal failing WCAG (2.7:1) without losing the brand hue.
- 2026-10-10: Lime reserved for fills/accents; dark text on lime chips, fixes lime-on-white (2.0:1) per the brief's explicit accessibility concern.
- 2026-10-10: Emphasis = teal top band + elevation; status = semantic dot + label + tint. No left rail: brand is trust-led health, not ops.
- 2026-10-10: Navy documented as a structural/surface anchor (not a logo colour: logo wordmark is grey #9D9FA2).
- 2026-11-04: App shell specced: top bar adopted, labelled sidebar groups, tinted active state (no rail), drawer below 960px, searchable browse menus. See App shell above.
- 2026-11-04: Breakpoints aligned to the app (576 / 768 / 960 / 1200) so the guide and code share one set.
- 2026-11-04: Focus ring strengthened to a 2px gap plus solid 2px teal ring, with a bright-teal variant for navy grounds; the old pale halo was hard to see.
- 2026-11-04: Tables respecced after measuring the live app: container-query layouts, cards instead of sideways scrolling, one capped tag column, meta line under the title, Edit plus Publish or Unpublish inline with the rest in More, paging at 50.
