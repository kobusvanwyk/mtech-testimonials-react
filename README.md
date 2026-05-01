# Mannatech Testimonials Website

A React web application for collecting, managing, and publishing customer testimonials for Mannatech health products. The site is live at [mtechtestimonials.co.za](https://mtechtestimonials.co.za).

---

## What it does

**For the public:** Browse and search real customer stories about how Mannatech products helped with various health conditions. View photo galleries, share testimonials on WhatsApp, and download individual testimonials as branded PDFs.

**For admins:** Review incoming submissions, edit content, manage health conditions and product tags, import bulk testimonials from CSV, and configure site settings.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router |
| Styling | SCSS |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| PDF generation | @react-pdf/renderer |
| Image gallery | PhotoSwipe |
| Analytics | Google Tag Manager |
| Deployment | Netlify |

---

## Getting started

### 1. Install dependencies

```
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the dev server

```
npm run dev
```

Opens at `http://localhost:5173`.

---

## Available commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Build for production (output goes to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Pages

### Public

| Route | Page |
|---|---|
| `/` | Home — testimonial grid with infinite scroll |
| `/testimonial/:slug` | Individual testimonial with gallery and related stories |
| `/search` | Search results |
| `/submit` | 7-step form for submitting a new testimonial |
| `/terms` | Terms & Conditions |
| `/privacy` | Privacy Policy |

### Admin (login required)

| Route | Page |
|---|---|
| `/admin/dashboard` | Stats overview — totals, top conditions/products, recent submissions |
| `/admin/all` | Full testimonials table with status filtering |
| `/admin/edit/:id` | Edit a testimonial — text, status, gallery, tags |
| `/admin/categories` | Manage health conditions and product tags |
| `/admin/images` | Image manager |
| `/admin/import` | Bulk import from CSV |
| `/admin/settings` | Site settings — private mode, OpenGraph metadata |
| `/admin/pdf-settings` | PDF footer — contact details, logo, tagline |

---

## Key features

**Public site**
- Filterable testimonial grid — filter by condition or product via `?filter=` query param
- WhatsApp share button and copy-to-clipboard on every testimonial
- Downloadable PDF with Mannatech branding
- Image lightbox gallery (PhotoSwipe)
- Related testimonials matched by shared conditions and products
- Private mode — when enabled, the public site is hidden and only the admin area is accessible

**Submission form**
- 7-step guided form with progress indicator
- Anonymous submission option
- Photo upload (up to 8 images, 3MB each, JPG/PNG)
- Honeypot spam protection
- All submissions land as Pending for admin review

**Admin**
- Full testimonial lifecycle: Pending → Approved / Needs Editing / Rejected / Unpublished
- Bulk CSV import (see the companion `process.py` tool for generating import-ready CSVs from Telegram exports)
- PDF branding customisation (logo, footer contact info)
- OpenGraph metadata configuration for social sharing previews

---

## Database tables

| Table | Purpose |
|---|---|
| `testimonials` | All testimonial content and metadata |
| `conditions` | Health condition tags |
| `products` | Mannatech product tags |
| `site_settings` | Site-wide config (private mode, OG tags, PDF settings) |

Supabase migrations are in `supabase/migrations/`. Run them in order when setting up a fresh project.

---

## Deployment

The app is deployed on Netlify. On push to `main` or `develop`, Netlify automatically rebuilds and deploys.

Set the same two environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the Netlify project settings under Environment Variables.

The `netlify.toml` file handles routing and can optionally route social crawler requests to a Supabase edge function (`og-meta`) for per-testimonial OpenGraph tags.

---

## Importing testimonials

The companion tool in the `mtech-testimonials-telegram` project processes Telegram group exports into structured testimonials and can publish them directly to Supabase. See that project's README for the full workflow.
