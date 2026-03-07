-- Migration: backfill slugs for existing testimonials that don't have one
-- Run this in your Supabase SQL editor after add_slug_to_testimonials.sql

-- This creates a basic slug from the title:
-- lowercase, spaces to hyphens, strips special chars
UPDATE testimonials
SET slug = regexp_replace(
    regexp_replace(
        lower(trim(title)),
        '[^a-z0-9\s-]', '', 'g'   -- remove non-alphanumeric (keep spaces and hyphens)
    ),
    '[\s-]+', '-', 'g'             -- collapse spaces/hyphens to single hyphen
)
WHERE slug IS NULL;

-- Handle any duplicate slugs by appending the first 8 chars of the ID
UPDATE testimonials t1
SET slug = t1.slug || '-' || left(t1.id::text, 8)
WHERE (
    SELECT COUNT(*) FROM testimonials t2
    WHERE t2.slug = t1.slug
) > 1;
