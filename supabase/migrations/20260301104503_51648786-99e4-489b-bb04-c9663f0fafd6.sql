-- Create storage bucket for debate images
INSERT INTO storage.buckets (id, name, public) VALUES ('debate-images', 'debate-images', true);

-- Allow public read access
CREATE POLICY "Public can view debate images"
ON storage.objects FOR SELECT
USING (bucket_id = 'debate-images');

-- Allow service role to upload debate images
CREATE POLICY "Service role can upload debate images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'debate-images');