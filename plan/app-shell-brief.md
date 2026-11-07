# App shell brief (for the design-system session)

> **Status (2026-11-04): specced.** The App shell is in `design/ui-guide.html` (sidebar group "App shell": overview, admin sidebar, top bar, mobile, login, public navbar and footer) and recorded in `design/DESIGN.md` under "App shell". Decisions: top bar adopted, labelled sidebar groups with Pending Review, tinted active state (no rail), drawer below 960px, no bottom tab bar, branded login card, searchable View by Condition / Product menus. Breakpoints now follow the app (576 / 768 / 960 / 1200), and the focus ring was strengthened (`--focus-ring`, `--focus-ring-dark`). Ready for the build session: `AdminLayout.jsx` / `_admin.scss`, `Navbar.jsx` / `Footer.jsx`.


**Ask:** add an **App shell** section to `design/ui-guide.html` (and a matching entry in `design/DESIGN.md`) so the admin and public frames are specced like every other component. The live app is being reconciled to the guide in a separate session (branch `ui-refresh-design-system`); once the shell spec lands in the guide, it gets built there.

**Why now:** the guide covers tabs, breadcrumb and pagination under Navigation, but nothing that frames a page. DESIGN.md only mentions the sidebar as a colour role (navy surface) and reserves a `--z-topbar: 300` slot. The shell is the most-seen UI in the admin and it's currently unspecced.

---

## Scope

1. **Admin sidebar** (desktop)
2. **Admin top bar** (does not exist yet; decide whether it should)
3. **Admin navigation on tablet and mobile**
4. **Admin login screen** (same frame, logged-out state)
5. **Public navbar** (logo, View by Condition / Product dropdowns, mobile drawer) and **public footer** as components. The announcement bar is already in the guide.

---

## Current state (live app)

Source: `src/pages/admin/AdminLayout.jsx`, styles in `src/styles/_admin.scss` (lines ~120 to 235).

| Area | What's there today |
|------|--------------------|
| Frame | Fixed 240px navy sidebar (`--dark`) from 768px up; content area offset by 240px. Content ground is `--surface-hover` #f1f5f9 (not `--bg` #f5f7fa). |
| Brand | The words "MTech Admin" in white text. No logo, even though the white logo variant now exists (`public/mtech-testimonials-logo-white.svg`). |
| Nav | 11 links in 4 unlabelled groups separated by thin dividers: (Dashboard, All Testimonials, Ask AI) / (Categories, Image Manager) / (Import CSV, WhatsApp Sync, Duplicate Scanner) / (Settings, PDF Settings). Lucide icons at 16px. WhatsApp uses a hand-inlined brand SVG. |
| Active state | Navy-mid ground + white text + **3px teal left rail**. |
| Sidebar footer | Signed-in email, "View Site" (opens public site), "Logout" (turns red on hover). The email has a light grey `--border-light` underline that reads as a stray bright line on navy. |
| Top bar | None. Page titles are plain `h2`s inside each page; there is no persistent page header, search entry or user menu. |
| Mobile (< 768px) | The sidebar becomes a full-width navy block at the top: title, then the nav as a **horizontally scrolling strip**, then the email / View Site / Logout stacked underneath, all before the page content. Cramped, and the account actions take prime space. |
| Login | Centred card with a lock icon, "Admin Login", email + password (show/hide), pill Sign In button. No logo. |
| Public shell | Teal announcement bar, white navbar (colour logo + two pill dropdown triggers), mobile nav drawer, navy footer (white logo, legal links, disclaimer). |

## Conflicts with DESIGN.md / the guide

- **Coloured rail on the active nav item.** DESIGN.md §3.6b: "No coloured rail anywhere." Needs a guide-consistent active treatment (tinted ground, accent text/icon, or similar).
- **No logo on navy grounds.** DESIGN.md says to use the white variant on navy (footer, hero); the admin sidebar and login are the obvious other places.
- **Stray light border on navy** (`.admin-user-email`): a light-ground token used on a dark surface.
- **Content ground** uses `--surface-hover`, not `--bg`.
- **Ad-hoc z-index** (`z-index: 200` on the sidebar) rather than the scale (`--z-sticky` / `--z-topbar` / `--z-drawer`).
- **Breakpoints differ.** The app's mixins are 576 / 768 / 960 / 1200. The guide defines Mobile < 640, Tablet 640 to 767, Desktop ≥ 768. The 768 desktop line matches; the mobile/tablet split does not. Worth the guide stating which the shell follows.
- (Touch targets are fine: nav items measure 45.5px against the 44px minimum.)

## Behaviour issues noticed (logic, flagged for awareness, not design)

- **Active state is an exact path match.** The Dashboard link points to `/admin` but the dashboard renders at `/admin/dashboard`, so Dashboard **never shows as active**. Nested pages (e.g. `/admin/edit/:id`) highlight nothing instead of their parent (All Testimonials). Small fix in `AdminLayout.jsx`, to be done in the build session with your OK.
- **Pending Review** (`/admin/pending`, reached from the dashboard tile) is not in the nav.

---

## Open questions for the design session

1. **Top bar: yes or no?** If yes, what lives in it? Candidates: page title or breadcrumb, a global "Ask AI" search entry, a user menu (email, View Site, Logout, which would empty the sidebar footer), and possibly a site-status pill for Private Mode.
2. **Sidebar groups:** keep unlabelled dividers, or add overline group labels (e.g. Content, Library, Import, Settings)?
3. **Active / hover / focus treatment** on navy, without a rail.
4. **Collapsed sidebar** on mid widths (icons only, 64 to 72px) or straight to a drawer?
5. **Mobile model:** hamburger + slide-over drawer (the guide's Drawer component), a bottom tab bar for the top 4 destinations, or both?
6. **Brand lockup in the sidebar:** full white logo, the square leaf mark only, or the mark + "Admin" label?
7. **Login screen:** branded (logo, navy or split layout) or keep the neutral card?
8. **Public navbar and footer:** spec them as components alongside the admin shell, or leave as-is for now?

## Constraints and tokens to build on

- Navy surfaces: `--dark` #1a1a2e, `--dark-2`, `--dark-3`. White logo variant for navy grounds.
- Accent: bright `--accent` #03B09F for fills with white text (**human override**, accepted 2.7:1), `--accent-ink` for teal text on light grounds.
- **All buttons are pills** (human override; the guide shows no plain-rounded buttons).
- Lucide icons, 1.5px stroke, `--icon-*` size tokens. Plus Jakarta Sans throughout.
- Z-index scale: dropdown 100, sticky 200, topbar 300, drawer 400, modal-backdrop 500, modal 600.
- Motion: `--ease-out` / `--ease-in-out`, 120 / 220 / 360ms, no spring. Respect reduced motion.
- 44px minimum touch targets. Focus ring `--focus-ring`.
- Existing guide components the shell should reuse: Drawer / slide-over, Dropdown menu, Avatars (for the user menu), Tabs with counts, the Ask AI search bar.

## Requested deliverable

A new **App shell** section in `ui-guide.html` showing:
- Admin frame at desktop, tablet and mobile, including the open drawer state on mobile.
- Sidebar nav item states: default, hover, active, focus.
- Top bar (if adopted) with its contents.
- Login screen.
- Public navbar (desktop + mobile drawer) and footer, if in scope.

Plus a short DESIGN.md entry recording the decisions (top bar, active treatment, mobile model) and their rationale.

**Hand back:** once it's in the guide, the build session implements it in `AdminLayout.jsx` / `_admin.scss` (and `Navbar.jsx` / `Footer.jsx` for public), verifying each breakpoint in the browser.
