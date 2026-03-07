# Go-Live Deployment Guide

This guide covers two deployment options for the MTech Testimonials React app.
Choose based on whether you want per-testimonial WhatsApp/social share previews.

---

## Before You Start

Make sure the following are done in Supabase first:

1. **Run all SQL migrations** — open Supabase → SQL Editor and run each file in
   `supabase/migrations/` in order, including the latest `20260307_site_settings.sql`
   which creates the `site_settings` table.

2. **Deploy the og-meta edge function** — see instructions below under whichever
   deployment option you choose.

3. **Configure Admin → Settings** — once the site is live, log into the admin panel
   and verify/update the OG settings (title, description, image URL, site URL).

---

## Option A — Simple Hosting (registerdomain.co.za or any shared host)

Use this if you don't need per-testimonial WhatsApp previews. The site-wide OG
image and title from `index.html` will still work correctly.

### Step 1 — Build the app

In your terminal, from the project folder:
```bash
npm run build
```
This creates a `dist/` folder containing all the files for deployment.

### Step 2 — Upload to your host

Log into your hosting control panel (cPanel or similar) and upload the entire
contents of the `dist/` folder to your `public_html` folder via File Manager or FTP.

### Step 3 — Fix page refreshes (SPA routing)

React Router handles navigation in the browser, but if a user refreshes on a page
like `/testimonial/some-slug` the server doesn't know what to do. Fix this by
creating a file called `.htaccess` in `public_html` with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Step 4 — Environment variables

Shared hosting doesn't support `.env` files for a built Vite app — the environment
variables get baked in at build time. Before running `npm run build`, make sure your
`.env.local` file exists locally with:
```
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5 — Deploy Supabase og-meta edge function (optional)

Even on simple hosting, you can still deploy the `og-meta` edge function to Supabase
so it's ready. The function just won't be automatically called for social crawlers
unless you add the Netlify routing (Option B). You can deploy it manually via the
Supabase Dashboard:

- Go to Supabase → **Edge Functions** → **Deploy a new function**
- Name it `og-meta`
- Paste the contents of `supabase/functions/og-meta/index.ts`
- Click Deploy

---

## Option B — Netlify (recommended for full OG support)

Use this if you want per-testimonial WhatsApp previews where each shared link
shows the testimonial's own title and story excerpt.

### Step 1 — Create a Netlify account

Go to [netlify.com](https://netlify.com) → Sign up → **Sign up with GitHub**.
This connects your GitHub account so Netlify can access your repos.

### Step 2 — Create a new site

- Click **Add new site → Import an existing project**
- Choose **GitHub**
- Select `mtech-testimonials-react`
- Set the branch to **develop** (or `main` when you're ready for production)
- Netlify will auto-detect the build settings from `netlify.toml` — no changes needed:
  - Build command: `npm run build`
  - Publish directory: `dist`

### Step 3 — Add environment variables

Before deploying, click **Show advanced → Add variable** and add:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_URL` | Same Supabase project URL (used by the Netlify edge function) |

Find these in Supabase → **Project Settings → API**.

### Step 4 — Deploy

Click **Deploy site**. Netlify will build and deploy — takes about a minute.
You'll get a temporary URL like `funny-name-123.netlify.app` to test with.

### Step 5 — Deploy the Supabase og-meta edge function

- Go to Supabase → **Edge Functions** → **Deploy a new function**
- Name it `og-meta`
- Paste the contents of `supabase/functions/og-meta/index.ts`
- Click Deploy

### Step 6 — Test OG tags

Replace `YOUR_REF` and `your-testimonial-slug` with your actual values:
```bash
curl -A "WhatsApp/2.0" "https://YOUR_REF.supabase.co/functions/v1/og-meta?slug=your-testimonial-slug"
```
You should see HTML back with the correct title and story excerpt.

### Step 7 — Set up your custom domain

- In Netlify → **Site configuration → Domain management → Add a domain**
- Enter `mtechtestimonials.co.za`
- Netlify will show you DNS records to add at your registrar (registerdomain.co.za)
- Log into registerdomain.co.za and add the DNS records Netlify specifies
- DNS changes typically take 1–4 hours to propagate
- Netlify automatically provisions a free SSL (HTTPS) certificate once DNS is live

### Step 8 — Automatic deploys

From this point on, every push to your `develop` branch on GitHub will
automatically trigger a new build and deploy on Netlify. No manual steps needed.

---

## Supabase og-meta Edge Function URL

Once deployed, your edge function is accessible at:
```
https://YOUR_REF.supabase.co/functions/v1/og-meta?slug=TESTIMONIAL_SLUG
```

Your Supabase project ref is found in Supabase → **Project Settings → General → Reference ID**.

---

## Summary: Which option should I choose?

| | Option A (Simple Hosting) | Option B (Netlify) |
|---|---|---|
| Per-testimonial WhatsApp previews | ❌ | ✅ |
| Site-wide OG image | ✅ | ✅ |
| Auto-deploy on GitHub push | ❌ | ✅ |
| Free | ✅ | ✅ |
| Complexity | Low | Medium |

For a closed group of users where sharing is occasional, **Option A is perfectly fine**.
When you're ready to go fully public, switching to Option B is straightforward.

