-- Migration: backfill slugs for existing testimonials (duplicate-safe)
-- Run this in your Supabase SQL editor

-- Temporarily drop the unique index so we can safely assign slugs
DROP INDEX IF EXISTS testimonials_slug_idx;

-- Assign base slug from title
UPDATE testimonials
SET slug = regexp_replace(
    regexp_replace(
        lower(trim(title)),
        '[^a-z0-9\s-]', '', 'g'
    ),
    '[\s-]+', '-', 'g'
)
WHERE slug IS NULL;

-- Fix any duplicates by appending first 8 chars of UUID
UPDATE testimonials t1
SET slug = t1.slug || '-' || left(t1.id::text, 8)
WHERE EXISTS (
    SELECT 1 FROM testimonials t2
    WHERE t2.slug = t1.slug
    AND t2.id <> t1.id
);

-- Recreate the unique index
CREATE UNIQUE INDEX testimonials_slug_idx
    ON testimonials (slug)
    WHERE slug IS NOT NULL;
