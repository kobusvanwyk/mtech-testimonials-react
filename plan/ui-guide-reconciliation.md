# UI Guide Reconciliation, progress tracker

Reconciling the live app against `design/ui-guide.html`, top-to-bottom.
Mode: **hybrid** (restyle + restructure where sensible, flag data gaps). Checkpoint **per group**.
Branch: `ui-refresh-design-system`.

## Audit dimensions (apply to every component)
colour · type scale · spacing · radius · **border width (guide = 1px/1.5px, not 2-3px)** ·
**icon stroke 1.5 & size tokens** · states (hover/focus/active/disabled) · anatomy · responsive.

## ① Foundation  ✅ (foundational pieces; heading-size application + input borders flow into ②)
- [x] Icon system, `.lucide{stroke-width:1.5px}` global; `--icon-xs..xl` tokens added. (verified 1.5px live)
- [x] Design tokens, reconciled (alias layer) + icon/fluid-type/space/z/anim tokens
- [x] Typography, fluid scale tokens added (`--text-display/h1/h2/h3/overline/body-lg/body-fluid/caption/code`); body base size+1.6 leading; `.eyebrow`/`.overline` + `.prose` 65ch. Heading-size APPLICATION per-component in ②.
- [~] Spacing & grid, base-4 tokens present. 44px touch-target audit → during component passes.
- [~] Responsive & mobile, breakpoints noted (<640 / 640-767 / ≥768). Per-component mobile behaviour → in each component.
- [x] Buttons, pill + bright-teal primary; outline borders thinned 2px→1.5px. Input/divider borders → Form elements pass.

## ② Components, pass 1 done (present components reconciled; absent ones flagged)
RECONCILED:
- [x] Buttons, pill + bright-teal; outline borders 1.5px
- [x] Form elements, inputs 2px→1px, hover(border-strong)+focus(accent-ink + focus-ring); selectable cards/toggles/tag-input/checkbox 2px→1px; dropzone 1.5px dashed
- [x] Cards, +1px border, hover -2px + shadow-md (guide spec)
- [x] Alerts & banners, step-desc callout → accent tokens + 3px left border (guide .alert)
- [x] Data table, th 2px→1px + tbody row-hover tint (guide)
- [x] Navigation / Dropdown / Drawer, neutral borders 2px→1px; active accents kept
- [~] Badges & chips, status badges handled in ③ Review status set
- [~] Stepper / Progress / File upload / Date picker / Modal / Empty states, borders/tokens normalized; deep anatomy per item as needed
NET-NEW decision (2026-10-11): build Avatars + Skeletons; Toasts as-needed; SKIP Tooltips/Accordion/Quantity.
- [x] Avatars, `Avatar.jsx` (initials + deterministic brand colour; neutral user-icon fallback for Anonymous; no location, no data). `_avatar.scss`.
- [x] Skeletons, `Skeleton.jsx`, full coverage of initial-load states:
  - Public: Home grid, Search results (`TestimonialGridSkeleton`)
  - Admin: Dashboard (`DashboardSkeleton`), All Testimonials (`TableSkeleton`), Image Manager (`ImageGridSkeleton`), Categories (`ListPageSkeleton`), Settings + PDF Settings (`FormSkeleton`), Edit Testimonial (`EditTestimonialSkeleton`), Pending Review (`ReviewSkeleton`)
  - N/A (action-driven, no initial load): Duplicates (Scan), Import (upload), WhatsApp Sync, Ask AI (own loading UI)
  - Still plain text: Single testimonial page (public detail), optional.
- [ ] Toasts, fold in during admin passes only where an action lacks feedback.

## ③ Product  (IN PROGRESS)
- [x] Testimonial card, DECISION: Option A (hybrid). Avatar + name + date added, title-first kept. Live.
- [x] Admin KPI tiles: inset surface-2 tiles, overline label, tabular number, no coloured top-line; grouped in a white panel, auto-fit equal widths.
- [x] Ask AI search: 52px pill input + shadow + focus ring, 52px Ask button, chips, gradient summary bar, result cards with shadow/hover, actions as a row of pill-outline buttons + round PDF icon button.
- [x] Review status set: dot + uppercase label on semantic tint (`.status-badge`, `.dup-card-status`). Published is now success green (was teal), per guide/DESIGN.md.
- [x] Import source chips: `.badge-source` to tokens, pill, Lucide icon + title-case label (table + Duplicates).
- [x] Submit stepper: labelled 32px nodes, completed = success green + check, active = bright teal (override), green connectors. Removed the redundant "Step X of 7, Next" line. Mobile (< 480px) keeps the app's progress bar (deliberate deviation from the guide's bare nodes).
- [x] Duplicate match: tinted warning header strip (tokens, no hex), inset sides with "vs", keep side outlined in success (removed the inset rail), pill-outline actions, shared status/source chips.
- [x] Filters & search: public browse menus rebuilt (2026-11-06). Home and results search bars: leading magnifier, 32px round clear button, pill field with focus ring (2026-11-06).
- [x] PDF export preview: TestimonialPDF restyled to the guide (logo header + teal rule, filled chips, contact + disclaimer footer). Live preview card on PDF Settings, plus a Preview PDF dialog (Edit, All Testimonials, Pending Review, PDF Settings). 2026-11-06.
- Noted for later: All Testimonials row actions, "Edit" is plain text beside pill View/Unpublish/Delete (data-table pass). Existing UI copy contains em dashes (e.g. submit step 1 callout, Duplicate Scanner intro); flag to Kobus, not changed.

## ③ Product
Testimonial card (⚠ anatomy differs: guide=quote+avatar+on-card Share/PDF; app=title+excerpt+link) ·
Filters & search · Review status set · Submit stepper (7-step) · Duplicate match · Import source chips ·
PDF export preview · Admin KPI tiles

## ④ Product · from your screens  ✅ (2026-11-06)
- [x] Ranked bar chart: Dashboard Top Conditions / Products on `.barchart` (150px right-aligned label, 14px round track, tabular count), ordered lists.
- [x] Tabs with counts: count pill matched to the guide (no border, 18px, .64rem).
- [x] List row: Dashboard Recent Submissions on `.lrow` with the shared StatusBadge and a small ghost Edit.
- [~] Filter KPI tiles: tiles follow the guide's look (warning accent on Orphans) but are NOT clickable; the tabs in the toolbar card filter. Kobus to confirm (see hand-back).
- [x] Rich-text editor: one `.rte` box (toolbar, textarea, live counts), focus ring on the whole box.
- [x] Multi-select tag grid: two columns (one below 480px), tick when selected, checkboxes reachable by keyboard again (were display:none), fieldset + legend on Edit.
- [x] Activity timeline: Edit history on `.timeline`, newest in accent, older muted, status values shown as labels (approved = Published).
- [x] Outline chips: `.tag-outline` for dense lists (tables, card grids, import rows, Categories, duplicate cards); filled tint default elsewhere (testimonial page, PDF, review cards).
- [x] Photo gallery + lightbox: 96px square thumbnail buttons (keyboard opens PhotoSwipe).
- [x] Share bar: WhatsApp green with dark text (white failed contrast), Copy link as secondary pill.
- [x] View switcher & sort: already done (Image Manager toolbar card).
- [x] Rich image tile: square thumb, select box and Gallery / Orphan badges on the photo, amber "Not used", labelled action row.
- [x] Management list row: Categories rows rebuilt (outline chip, count, ghost Rename / Delete). Fixed sideways scroll.
- [x] Merge / dedupe picker: warning panel, pick cards with radios, primary Keep + ghost Not a duplicate.
- [x] Instruction steps callout: WhatsApp how-to on the guide's spacing and type.
- [x] Announcement bar & card: dark text on teal (white failed contrast), sentence-case button; card excerpts strip markdown (shared `storyExcerpt`).

## ⑤ Reference
Utilities

## Flagged data gaps (developer to decide)
- Testimonial card: guide shows avatar (initials) + location (e.g. "Durban · KZN"). App may lack location/avatar data.
