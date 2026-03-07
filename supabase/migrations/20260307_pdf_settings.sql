-- PDF Branding Settings
-- Run this in the Supabase SQL Editor after the site_settings migration

INSERT INTO site_settings (key, value) VALUES
  ('pdf_logo_url',         ''),
  ('pdf_contact_name',     ''),
  ('pdf_contact_phone',    ''),
  ('pdf_contact_email',    ''),
  ('pdf_contact_whatsapp', ''),
  ('pdf_footer_tagline',   'Mannatech – Transforming Lives Naturally'),
  ('pdf_font_threshold',   '1200')
ON CONFLICT (key) DO NOTHING;
