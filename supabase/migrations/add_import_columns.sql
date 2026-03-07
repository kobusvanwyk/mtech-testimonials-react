ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS is_imported boolean DEFAULT false;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS imported_from text;
