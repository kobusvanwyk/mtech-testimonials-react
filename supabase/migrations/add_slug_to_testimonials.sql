-- Migration: add slug column to testimonials
-- Run this in your Supabase SQL editor

ALTER TABLE testimonials
    ADD COLUMN IF NOT EXISTS slug text;

-- Make it unique so lookups are safe
CREATE UNIQUE INDEX IF NOT EXISTS testimonials_slug_idx
    ON testimonials (slug)
    WHERE slug IS NOT NULL;
