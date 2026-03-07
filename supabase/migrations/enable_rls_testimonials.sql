-- Enable RLS on testimonials table
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (submit a testimonial)
CREATE POLICY "Public can insert testimonials"
ON testimonials FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending');

-- Only authenticated admins can SELECT
CREATE POLICY "Authenticated users can select testimonials"
ON testimonials FOR SELECT
TO authenticated
USING (true);

-- Allow public to read only approved testimonials
CREATE POLICY "Public can read approved testimonials"
ON testimonials FOR SELECT
TO anon
USING (status = 'approved');

-- Only authenticated admins can UPDATE
CREATE POLICY "Authenticated users can update testimonials"
ON testimonials FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated admins can DELETE
CREATE POLICY "Authenticated users can delete testimonials"
ON testimonials FOR DELETE
TO authenticated
USING (true);
