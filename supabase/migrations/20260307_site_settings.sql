-- Site settings table for admin-managed config
create table if not exists site_settings (
    key   text primary key,
    value text
);

-- Seed default OG values
insert into site_settings (key, value) values
    ('og_site_name',   'Mannatech Testimonials Database'),
    ('og_title',       'Mannatech Testimonials Database'),
    ('og_description', 'Real stories from real people. Discover how Mannatech products have supported the health and wellbeing of people across South Africa.'),
    ('og_image_url',   'https://mtechtestimonials.co.za/wp-content/uploads/2026/03/og-image.png'),
    ('og_url',         'https://mtechtestimonials.co.za')
on conflict (key) do nothing;

-- Allow public read (needed for edge function + app)
alter table site_settings enable row level security;
create policy "Public can read settings" on site_settings for select using (true);
create policy "Authenticated can update settings" on site_settings for all using (auth.role() = 'authenticated');
