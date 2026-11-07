# Design Plan — Mtech Testimonials

**Outcome:** A complete, reconciled design system for the Mtech Testimonials platform (Mannatech SA), recorded in `design/DESIGN.md` and shipped as `design/brand-guidelines.html` and `design/ui-guide.html`. Documentation only — the running React/Vite/SCSS app is NOT modified.

## Fixed anchors (do not change)
- Logo: `public/mtech-testimonials-logo.svg` (teal→lime gradient leaf mark + grey wordmark + teal "TESTIMONIALS DATABASE" pill)
- Core palette: teal `#03B09F`, lime `#ACC42A`, navy `#1a1a2e`
- Clean, credible, warm health/wellness tone (not clinical, not salesy)

## Locked decisions (developer-confirmed, 2026-10-10)
- **Typography:** unify on **Plus Jakarta Sans** for web AND PDF (drops the Avenir LT Pro / Typekit split). Already bundled + on Google Fonts.
- **Icons:** **Lucide** (matches the live app's `lucide-react`), 1.5px stroke.
- **Dark mode:** design a **full, independently-tuned dark theme** (navy surfaces retained for hero/footer/sidebar).
- **Product components:** build the proposed domain set; survey existing project *structure* (not CSS) to round it out.
- **Creative latitude:** component layer is reinvented fresh; brand identity (logo, teal/lime/navy, voice) stays fixed. No project CSS influences the new system.

## Scope
- [x] Phase 0: Quick intake — brand.md is source of truth; scope = Full; 4 direction gates answered
- [x] Phase 1: Reconnaissance (from brief + repo tokens/logo); direction confirmed
- [x] Phase 1 checkpoint approved (direction locked via AskUserQuestion)
- [ ] Phase 2: Brand refinement — tokens reconciled in DESIGN.md; brand-guidelines.html to full quality
- [ ] Phase 2 checkpoint approved by developer
- [x] Phase 3 §3.9 icon library confirmed (Lucide)
- [x] Phase 3 §3.0 product components confirmed
- [x] Phase 3: Foundation sections built → Gate A approved
- [x] Phase 3: Buttons + forms + cards built → Gate B approved (radio + card AI-ish feedback applied)
- [x] Phase 3: Remaining components + product group built — ui-guide.html draft complete (36 sections, interactions + dark mode verified)
- [x] Phase 3: Extra product components from developer screenshots — 16 added (bar chart, count tabs, list row, filter tiles, rich-text editor, multi-select grid, timeline, outline chips, gallery+lightbox, share bar, view switcher, rich image tile, management row, merge picker, steps callout, announcement+card); ui-guide.html now 52 sections, verified
- [x] Phase 3 checkpoint approved by developer
- [x] Phase 4: Polish & favicon brief recorded — both files verified light+dark, mobile drawer, no overflow
- [x] Phase 5: Handoff — DESIGN.md finalised; both files verified in browser; SEO/a11y design readiness recorded
- [x] Phase 5 checkpoint — developer chose Product mockup (app.html), later removed it
- [x] Phase 6: app.html built (5 pages) then DELETED at developer's request — UI to be applied to existing React surfaces in a separate dev session
- [x] White logo variant generated (design/mtech-testimonials-logo-white.svg) + wired into brand-guidelines dark grounds; dark-ground gap resolved

## Bugs
(none yet)

## Commits
(none yet — documentation only, no app code touched)

## Status: Complete — DESIGN.md, brand-guidelines.html, ui-guide.html, white logo variant (app.html built then removed at developer's request)
