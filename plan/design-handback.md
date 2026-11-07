# Design hand-back (build session to design session)

**Date:** 2026-11-05 · **Branch:** `ui-refresh-design-system` · **From:** the build session applying `design/` to the app.

The patterns below were built in the app and are not yet in `design/ui-guide.html` or `design/DESIGN.md`. Each was agreed with Kobus. Please add them to the guide so they stop being one-offs, or say what to change.

---

## 1. Page header (admin)

- **Layout:** H1 on the left, with an optional meta line under it (status badge, author, date). Actions sit on the right and wrap under the title on narrow screens.
- **Action order:** outline secondary actions first, then the bright teal primary, then a ⋯ More menu.
- **Destructive actions** never sit in the header. Delete goes last in More, in red, after a divider (same rule as table rows).
- **No Back link.** The top bar breadcrumb does that job.
- **Live on:** Edit Testimonial (Preview · Save changes · More: Download PDF, Delete), Image Manager (Refresh · Upload image), All Testimonials (Export CSV), Import CSV (Download sample CSV), Settings and PDF Settings (Save).

## 2. Unsaved-changes save bar

- **What it is:** a dark pill pinned to the bottom of the screen, shown only while a form has unsaved changes. It reads "You have unsaved changes", with Discard (ghost) and Save changes (primary).
- **Why:** long forms used to lose the Save button off the top of the page.
- **Live on:** Edit Testimonial.

## 3. Controls sit with the content they control (layout rule)

1. **Tables and lists:** the filters go inside the data card's header, as the guide already does for tables. That means a tabs row, then a tools row, then the data.
2. **Grids of cards:** wrapping card grids in another card is heavy, so they get a separate **toolbar card** directly above the grid. Live on Image Manager (tabs row, then count, Grid/List, sort and "Select all orphans") and Duplicate Scanner.
3. **Search-first pages:** one **search panel** card holds the input, the action and the suggestions. Live on Ask AI, and on WhatsApp Sync as the import panel (how-to, drop zone, dry-run option and Sync).
4. **Page-level actions** stay in the page header.
5. **Not sticky.** The bulk-selection bar is the only sticky bar under the top bar.

## 4. Pending Review queue (new screen)

- **The queue:** a focused list of `pending` submissions, oldest first, with a "n waiting for review" count.
- **Each card has:**
  - title;
  - avatar, name, date, photo count and source chip;
  - condition and product tags;
  - the story, cut to 5 lines with "Read the full story".
- **Actions on each card:** Approve and publish (primary), Needs editing (outline), Reject (outline, red text) and "Edit first" (link). On a phone the buttons stack full width.
- **After a decision:** the card leaves the queue and a toast appears with Undo for 8 seconds.
- **When empty:** an "All caught up" state.

## 5. Human calls that deviate from the guide

- **Ask AI input text:** set to `--text-body`, not `--text-body-lg`. At 18.4px it overpowered the page copy and the 13px chips. The 52px pill height is kept. Please update `.askai-input input` in the guide to match.

## 6. Decided since (2026-11-06)

- **Import preview "to check" rows (amber).** A row is flagged when any of these apply:
  - it lists no conditions;
  - it lists no products;
  - the story is under 40 words;
  - its title matches an existing testimonial or another row in the file.

  Flagged rows still import as Pending, and the messages say what to look at. The summary reads "n ready · n to check · n will be skipped".
- **Public navbar menus.** Rebuilt to the guide:
  - desktop dropdowns with a filter field, A to Z groups, counts, highlighted matches, arrow keys and Escape;
  - mobile hamburger with a right-hand drawer whose rows open the full lists.

  The old right-hand side drawer (desktop) and bottom sheet (mobile) are gone.
- **Public footer, Explore links.** The guide lists View by Condition / View by Product, but those are menus, not pages. The footer uses Browse all stories, Submit your testimonial and How to use this site instead. In private mode it shows only Submit and the legal links. Please update the guide's footer to match.
- **PDF export restyled to the guide.**
  - Logo header over a 2px teal rule, guide tag styles, and a white footer with the contact block, tagline and the guide's disclaimer and copyright line.
  - The "Testimonials Database" header label shows only when there is no logo image, because both the default logo and Kobus's custom logo already read "Testimonials Database". Please update `.pdf-preview .ph` in the guide to match.
  - With no custom logo, the PDF uses the Mtech Testimonials logo.
- **Brand name spelling.** The app now writes "Mtech Testimonials" everywhere, matching DESIGN.md.

## 7. PDF preview dialog (new pattern, 2026-11-06)

- **What it is:** "Preview PDF" opens the real exported PDF in the browser's own viewer, inside a wide modal. It has the title and testimonial name, a skeleton while the PDF builds, and Close (secondary) and Download PDF (primary) in the footer.
- **Built on** the guide's modal: backdrop, `--radius-xl`, `--shadow-lg`, the modal z-index. It is widened to 880px for an A4 page.
- **Where:**
  - Edit Testimonial: More menu, using the unsaved edits.
  - All Testimonials: row More menu.
  - Pending Review: a quiet link beside "Edit first".
  - PDF Settings: "Preview with a real testimonial", using the unsaved settings.
- **Phones:** below 768px the Preview action is hidden, because phone browsers have no inline PDF viewer. Download stays.

## 8. Group 4 (product components from screens), 2026-11-06

Built to the guide. Points where the build differs, or the guide should change:

- **Filter KPI tiles (Image Manager):** the tiles match the guide's look, but they don't filter on click. The tabs in the toolbar card already filter, so two controls would do the same job. Kobus to confirm; if the guide keeps clickable tiles, the tabs go.
- **Warning text colour:** `.merge .mh` and `.media-tile .unused` use `--warning` as text in the guide, which is too light on white and on the warning tint. The build uses `--warning-ink`. Please update the guide.
- **Contrast fixes that match the guide but were wrong in the app:** the announcement bar and the WhatsApp button now use dark text on the bright fills.
- **Status badge variants:** `.status-badge.badge-info` (Gallery) and `.badge-warning` (Orphan) were added, so image badges share the review-status look.
- **Outline vs filled chips:**
  - Outline: tables, card grids, import rows, Categories and duplicate cards.
  - Filled: the testimonial page, the PDF and review cards.
- **Timeline:** history notes are stored as "Status: approved". They are shown with the admin label ("Status: Published").

## 9. New patterns, 2026-11-06 (later)

Please add these to the guide:

- **Categories page:**
  - One card, as the All Testimonials table does, with Conditions and Products tabs that show counts.
  - An amber "n possible duplicates" bar with a Review button.
  - A tools row: Select all, search, sort (A to Z, Most used, Least used), an "Unused (n)" toggle pill, Bulk add (secondary) and "Add condition" or "Add product" (primary).
  - Compact `.manage-row` list rows, a sticky selection bar, and a footer count.
- **Duplicate review dialog:** one group at a time (n of m), pick cards with radios, then Skip (ghost), Not a duplicate (secondary) and Keep "x" (primary).
- **Bulk add:** now a dialog, not an inline box.
- **Testimonial page layout:** the same 1200px width as home. One `.card` holds the title across the top, the story at `--max-prose` on the left, and a 320px side column on a hairline from 960px: byline, conditions, products, photos, then Download PDF, WhatsApp and Copy link at full width. Below 960px it stacks as title, about, story, then extras.
- **Search suggestions:** list rows (title, author and date, excerpt, three outline chips plus "+n") with an active-row tint, and a "See all results" row. Built as an ARIA combobox.
- **Submit success:** the empty-state layout with a success-tint icon circle, an H1 that receives focus, and primary and secondary pills.
- **Footer on short pages:** `#root` is a full-height flex column, so the footer always sits at the bottom of the window.

