# App vs UI guide audit

**Date:** 2026-11-06 · **Branch:** `ui-refresh-design-system` · **Against:** `design/ui-guide.html` (64 sections) and `design/DESIGN.md`

Each item is marked as below. Progress is logged at the end under "Done".

- **Fix:** clear gap against the guide. Small and safe.
- **Decide:** needs your call, or a guide update.
- **OK:** checked and matches.

## How it was checked

1. **Code scan:** every stylesheet was checked for values that are not on the guide's tokens (hard-coded colours, legacy aliases, raw font sizes, radii and spacing). Classes that no page uses any more were listed.
2. **Component inventory:** every page was checked for buttons, alerts, dialogs and inline styles that sit outside the guide's component families.
3. **Measured in the browser:** every public and admin page was probed for:
   - one H1;
   - heading colours;
   - button height and pill shape;
   - card border, radius and shadow;
   - input height, border, placeholder and label;
   - sideways scroll.

   The Submit flow was walked through all seven steps to the Review screen without submitting.
4. **By eye:** screenshots of each page were compared with the guide section it should follow.

---

## 1. Global findings (affect many pages)

These are the main source of the one-offs you kept spotting. Fixing them at the source fixes every page that uses them.

| # | Finding | Where | Guide | Mark |
|---|---|---|---|---|
| G1 | **Browser pop-ups for confirm and alert.** 22 places use the browser's own `confirm()` and `alert()` boxes (deletes, merges, failed PDF, upload errors). | Categories, Image Manager, All Testimonials, Edit, Duplicates, WhatsApp, Submit, PDF download | `#modal` (confirm), `#toast` (feedback) | **Fix:** one shared confirm dialog and one toast helper |
| G2 | **Error and success messages use five different one-off styles**: `dup-error`, `import-error`, `wa-error`, `error-msg`, `cat-message` and `upload-success-banner`. Some also show raw technical text, for example Ask AI's "Failed to execute 'json' on 'Response'". | Ask AI, Duplicates, Import, PDF Settings, Settings, WhatsApp, Login, Categories, Image Manager | `.alert` (`alert-error`, `alert-success`) or `.nbanner` | **Fix:** one `Alert` component, plus plain-language error text ("Ask AI could not reach the server. Try again in a moment.") |
| G3 | **Confirmation dialogs** (`.unsaved-modal`) have their own look: 12px corners, 32px padding, 420px wide, a black 45% backdrop with no blur. | Edit (delete, leave), Categories (bulk add, review) | `dialog.modal`: 16px corners (`--radius-xl`), `--space-6` padding, 540px wide, navy 50% backdrop with blur, `.mhd` / `.mbd` / `.mft` | **Fix** |
| G4 | **Button text size and weight.** The app's button family uses caption size at weight 700. The guide uses body size at weight 600. | Every button (my call earlier, not the guide) | `.btn` | **Decide:** match the guide (slightly larger, lighter buttons everywhere) or keep the compact look and record it in the guide |
| G5 | **Small button height.** The `btn-sm` I added is 32px. The guide's `.btn-sm` is 44px, to keep the touch target. | Dashboard Edit, Categories rows, merge dialog, bulk add | `.btn-sm` 44px | **Fix:** 44px on touch, or **Decide:** allow 32px in dense rows on desktop only |
| G6 | **Ten button classes outside the family**: `btn-next`, `btn-back`, `btn-submit`, `btn-load-more`, `btn-login`, `btn-private-mode-toggle`, `btn-nf-primary` / `btn-nf-secondary`, `btn-warn-outline`, `card-action-btn`, `ask-ai-btn`, plus `btn-pdf-download`, `btn-share` and `btn-whatsapp` (correct look, own CSS). | Submit, Home, Login, Settings, 404, Image Manager, cards, Ask AI, testimonial page | `.btn-*` family | **Fix:** move each to `btn-primary` / `btn-secondary` / `btn-ghost`. Note: the 404 secondary is a teal outline, but the guide's secondary is grey with dark text |
| G7 | **Cards without the guide's border.** Shadow-only cards with 16px corners. | Submit form, Terms and Privacy, Edit sections (`edit-section`) | `.card`: 1px border, 12px, `--shadow-sm` | **Fix** |
| G8 | **Inputs 37px tall** (guide 44px), on legacy tokens. | Settings, PDF Settings (`settings-input`), Edit (`edit-input`, `edit-select`) | `.field input` min-height 44px | **Fix** |
| G9 | **Labels not linked to fields.** Visible labels exist but aren't connected, so clicking does nothing and screen readers don't read them. | Submit (title, name, condition, story), Ask AI input, WhatsApp file input | Every input has a real `<label>` | **Fix** |
| G10 | **Native checkboxes** (with the teal accent colour) instead of the guide's drawn 20px box with a check. | Tables, Categories, Image Manager, WhatsApp dry run, Submit consent | `.check` | **Decide:** native is accessible and close. Switch only if you want the exact look |
| G11 | **Tooltips via `title=""`** (20 places). The guide has a tooltip component. | Image actions, tags, etc. | `#tooltips` | **Decide:** low value. I'd leave `title` and keep `aria-label` on icon buttons |
| G12 | **Utilities missing.** The guide asks for `.truncate`, `.invisible`, `.list-none` and `.focus-ring`. Only `.sr-only` exists. The ellipsis rule is hand-written about 15 times. | Group ⑤ | `#utilities` | **Fix:** add the four, use `.truncate` where repeated |
| G13 | **Dark theme.** The guide has a full dark theme. The app is light only. | Everywhere | `:root[data-theme="dark"]` | **Decide:** deferred earlier. Still out of scope? |

---

## 2. Page by page

### Public

**Home `/`**
- **Fix:** no H1 on the page. Add a visually hidden H1 ("Mannatech testimonials") or a visible intro heading. **Decide** which.
- **Fix:** "Load more" is a one-off button (`btn-load-more`). Make it a secondary pill.
- **Fix:** the result count ("286 testimonials") is plain text. Style it as the guide's meta line.
- **OK:** announcement bar, navbar, search field and suggestions, cards, chips, footer.

**Search results `/search`**
- **OK:** width, search field, cards, H1.
- **Fix:** "No results" uses `.no-results` on legacy tokens. Use the guide's `.empty` state (icon, heading, text, action).

**Testimonial page `/testimonial/…`**
- **OK:** card, side column, chips, gallery, share bar, H1.
- **Decide:** the side-column labels are H2s styled as small overlines. They read well, but heading level versus look is a choice. Alternative: plain labels with the story column getting the H2s.

**Submit `/submit` (7 steps)**
- **Fix:** the form container is shadow-only with 16px corners. Use the guide card (G7).
- **Fix:** no H1. Each step's question is an H2. Make the step question the H1, or add "Share your testimonial" as the H1.
- **Fix:** labels not linked (G9). Back, Continue and Submit are one-off buttons (G6). Disabled Continue is a grey pill, but the guide fades the primary.
- **Fix:** the Review step's box is a one-off card and lists conditions and products as plain text. Use the guide card with chips.
- **Decide:** the "Keep the name private" switch has no toggle in the guide. Keep it and add it to the guide, or use the guide's `.check`.
- **OK:** stepper (bright-teal override recorded), inputs, tag grid, drop zone, consent, thank-you page.

**Terms `/terms`, Privacy `/privacy`**
- **Fix:** card without a border (G7).
- **Fix:** H2s are bright teal and H3s are slate `#334155`. The guide's headings are `--text-1`. Bright teal text is also low contrast (2.4:1).
- **Fix:** the "Important" box is close to `.alert-error` but on its own CSS. Use the alert (G2).
- **Note:** 7 `legal-*` classes are unused. Check against the stored HTML before deleting.

**404**
- **Fix:** the secondary button is a teal outline (G6).
- **OK:** H1, layout. The large "404" with teal and lime is a brand flourish not in the guide. **Decide:** keep it.

**Private mode page** (shown to visitors while private mode is on)
- **Fix:** `private-mode-msg` is on legacy tokens. Use the `.empty` state layout.

### Admin

**Login**
- **Fix:** the error (`error-msg`) is a one-off (G2). `btn-login` is outside the family (G6).
- **OK:** navy ground, card, password toggle, placeholder.

**Dashboard**
- **Fix:** the "Edit" ghost buttons are 32px (G5).
- **OK:** KPI tiles, bar charts, list rows, H1.

**All Testimonials**
- **Fix:** the "+n" chip button is 25px tall. Make it at least 32px or make the whole chip cell the target.
- **Fix:** Delete uses the browser `confirm()` (G1).
- **OK:** card table, tabs, tools, bulk bar, pager, Preview PDF.

**Pending Review**
- **OK:** cards, actions, toast with Undo, empty state.

**Ask AI**
- **Fix:** the error is a one-off with raw technical text (G2).
- **Fix:** the input has no label (G9). `ask-ai-btn` is outside the family (G6).
- **OK:** search panel, chips, result cards (Ask AI input size is your recorded call).

**Edit Testimonial**
- **Fix:** section cards have no border (G7). Inputs and the select are 37px (G8).
- **Fix:** delete and leave dialogs use `.unsaved-modal` (G3). Gallery remove and replace use small overlay buttons (`gallery-overlay-btn`, 28px).
- **OK:** header, save bar, editor, tag grid, timeline, drop zone, Preview PDF.

**Categories**
- **Fix:** delete and merge use the browser `confirm()` (G1). The review and bulk-add dialogs use `.unsaved-modal` (G3). Row buttons are 32px (G5).
- **OK:** the new layout.

**Image Manager**
- **Fix:** delete, replace and copy use `confirm()` and `alert()` (G1). `btn-warn-outline` ("Delete n orphans") is outside the family (G6). `upload-success-banner` is a one-off (G2).
- **OK:** KPI tiles, toolbar card, tiles, list view.

**Import CSV**
- **Fix:** `import-error` and `import-result-success` are one-offs (G2).
- **Fix:** "Expected CSV format" is an H3 in grey. Use `--text-1`, or keep it as an overline label (**Decide**).
- **OK:** drop zone, preview table, amber rules.

**WhatsApp Sync**
- **Fix:** the file input has no label (G9). `wa-error` is a one-off (G2). Reset uses `confirm()` (G1).
- **Fix:** 26 legacy tokens and 11 hard-coded colours in `_whatsapp-sync.scss` (results and skipped list).
- **OK:** how-to callout, drop zone.

**Duplicate Scanner**
- **Fix:** `dup-error` is a one-off (G2). Delete uses `confirm()` (G1).
- **Decide:** before a scan the page is just a button. Add the guide's empty state ("No scan yet. Scan compares images and text…").

**Settings**
- **Fix:** inputs are 37px (G8). The Private Mode button is a one-off (G6). `import-error` is reused for errors (G2).
- **Fix:** the OG image preview shows a broken image with alt text when the URL fails. Hide it on error and show a short "Image could not be loaded" note.

**PDF Settings**
- **Fix:** inputs are 37px (G8). `import-error` (G2).
- **OK:** preview card, Preview PDF dialog.

---

## 3. Code health

- **Dead CSS:** 114 classes are defined but used nowhere. Most are in `_admin.scss` (old quick-view panel, old upload panel, old bulk bar, old review buttons) and `_button-radius.scss`.
  - False positives, to keep: avatar sizes and status classes built from variables, flatpickr's own classes, and the guide utilities.
  - **Fix:** delete the rest. That's roughly 600 lines of SCSS.
- **Dead component:** `src/components/PreviewModal.jsx` is imported nowhere. **Fix:** delete it and its `.modal-*` styles.
- **Legacy tokens:** 456 uses of the old alias layer (`--primary`, `--muted`, `--text-body` and so on), mostly in `_admin.scss` (256), `_pages.scss` (61), `_forms.scss` (44) and `_whatsapp-sync.scss` (26). Plus 125 hard-coded colours.
  - These still render correctly through the alias layer, but they are why one-off looks creep in.
  - **Fix:** migrate them as each area above is touched, then retire the alias layer at the end.

---

## 4. Suggested order

1. **G1, G2 and G3:** one confirm dialog, one alert and one toast, used everywhere. This removes most of the remaining one-offs at once.
2. **G6, G7 and G8:** buttons, cards and inputs onto the guide family, page by page, with each page's small fixes.
3. **G9:** labels, plus the H1 gaps (Home, Submit).
4. **G12:** utilities (Group ⑤).
5. **Code health:** delete dead CSS and `PreviewModal`, migrate legacy tokens in the touched files.
6. **Decide items:** G4, G5, G10, G11, G13 and the per-page ones. I need your call before touching these.

---

## Decisions (made 2026-11-06, Kobus delegated)

- **G4 Buttons:** match the guide, so body size at weight 600.
- **G5 Small buttons:** 44px, as in the guide.
- **G10 Checkboxes:** keep the browser's own checkbox with the `--accent-ink` accent colour. It is accessible and close to the guide; recorded as a deviation.
- **G13 Dark theme:** stays out of scope.

## Done

- **Step 1 (G1, G2, G3), 2026-11-06:**
  - **Shared feedback:** `FeedbackProvider` wraps the app, giving `useConfirm()` (the guide modal, focus on Cancel, Escape cancels) and `useToast()`. `friendlyError()` puts a plain sentence on screen and sends the raw error to the console.
  - **Pop-ups:** all 19 browser `confirm()` and `alert()` calls are replaced.
  - **Errors and successes:** all one-off boxes are replaced by `<Alert>` (the guide's `.alert`). Categories' flash messages are now toasts.
  - **Dialogs:** `.unsaved-modal` is replaced by the guide's `.modal`. `useDialog` is stack-aware, so a dialog opened on top of another closes on its own.
  - **Clean-up:** the dead `PreviewModal` and the old message and modal styles are deleted.
- **G4 and G5:** applied in `_admin-ui.scss`.
- **Step 2 (G6, G7, G8), 2026-11-06:**
  - **Buttons:** Submit (Back, Continue, Submit), Home "Load more", Login, the Settings private-mode toggle, 404 and Image Manager "Select all orphans" are now on `btn-primary` / `btn-secondary` / `btn-ghost`, and their one-off styles are deleted.
  - **Cards:** the Submit form, Terms and Privacy, Edit sections and Settings sections are on the guide card. Submit's Review step is a new inset summary with chips (`.submit-review`). Of the three conflicting `.review-card` rules, the old admin one is gone.
  - **Inputs:** Edit, Settings and PDF Settings fields are 44px guide fields; "Open URL" is a 44px round icon button.
- **Step 3 (G9, H1s), 2026-11-06:** labels are linked on Submit (title, name, conditions, story) and Ask AI; the hidden WhatsApp file input is out of the tab order. Home and Submit have screen-reader H1s.
- **Step 4 (G12, Group ⑤), 2026-11-06:** `.truncate`, `.invisible`, `.list-none` and `.focus-ring` were added. Existing hand-written ellipsis rules are not converted yet.
- **Per page, 2026-11-06:** Terms and Privacy headings are in `--text-1` and the callouts are on the guide alert. The Settings image preview explains a failed load instead of showing a broken image.
- **Code health, 2026-11-06:** about 580 lines of dead CSS are deleted (old quick view, upload panel, bulk bar, review buttons, tag input, legal blocks). Legacy-token uses are down from 456 to 236, and hard-coded colours from 125 to 87.

## Done, 2026-11-07

- **Empty states:** one shared `EmptyState` component on the guide's `.empty`, used on Home, Search, Image Manager, Pending Review, Duplicates (before a scan and on a clean scan) and the private-mode page.
- **Meta line:** the Home and Search result counts are caption size and muted, with the number in bold.
- **Touch targets:** the table's "+n" chip has a 44px hit area, and Edit's gallery buttons are 44px (always visible on touch screens and on keyboard focus).
- **Tokens:** the Import format guide, the Settings Private Mode card (status badge, warning edge while private) and the WhatsApp results and skipped list.

## Still open

- **Legacy tokens:** migrate what is left, then retire the alias layer.
- **Ellipsis rules:** swap hand-written ones for `.truncate`.
