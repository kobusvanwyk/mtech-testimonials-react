# Supabase Migrations

Run these in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

## Migration 1 - Add featured column
```sql
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
```

## Migration 2 - Add edit history column
```sql
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;
```

## Migration 3 - Site content table (Terms & Privacy editor)
```sql
CREATE TABLE IF NOT EXISTS site_content (
  key text PRIMARY KEY,
  content text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Allow admin to read and update
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reading site content" ON site_content FOR SELECT USING (true);
CREATE POLICY "Allow updating site content" ON site_content FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow inserting site content" ON site_content FOR INSERT WITH CHECK (true);
```
