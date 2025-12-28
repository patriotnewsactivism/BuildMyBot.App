-- Create storage bucket for website pages
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-pages', 'website-pages', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Users can upload their own pages
CREATE POLICY "Users can upload own pages"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'website-pages'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can update their own pages
CREATE POLICY "Users can update own pages"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'website-pages'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can delete their own pages
CREATE POLICY "Users can delete own pages"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'website-pages'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Anyone can view published pages (public bucket)
CREATE POLICY "Anyone can view published pages"
ON storage.objects FOR SELECT
USING (bucket_id = 'website-pages');

-- Comment documentation
COMMENT ON POLICY "Users can upload own pages" ON storage.objects IS 'Users can only upload files to their own user_id folder';
COMMENT ON POLICY "Anyone can view published pages" ON storage.objects IS 'Public read access for published website pages';
