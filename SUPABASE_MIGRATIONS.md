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
