-- Allow anyone to upload to testimonial-images (for form submissions)
CREATE POLICY "Public can upload testimonial images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'testimonial-images');

-- Allow anyone to read images (public gallery)
CREATE POLICY "Public can read testimonial images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'testimonial-images');

-- Only authenticated admins can delete images
CREATE POLICY "Authenticated users can delete testimonial images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'testimonial-images');
