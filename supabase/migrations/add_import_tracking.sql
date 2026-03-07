ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS imported_from text DEFAULT null;
