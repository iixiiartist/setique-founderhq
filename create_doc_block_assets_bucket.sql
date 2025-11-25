-- Creates the Supabase Storage bucket required for structured block assets (signatures, future widgets)
-- Run this script in the Supabase SQL editor or psql connected to your project database.

begin;

-- Create bucket if it does not exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'doc-block-assets', 'doc-block-assets', true, 10485760, array['image/png']::text[]
where not exists (
    select 1 from storage.buckets where id = 'doc-block-assets'
);

-- Public read access so documents can render signatures without auth friction
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public read doc block assets'
    ) THEN
        CREATE POLICY "Public read doc block assets" ON storage.objects
            FOR SELECT
            USING (bucket_id = 'doc-block-assets');
    END IF;
END $$;

-- Authenticated users may upload/delete assets they generate via the editor
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated manage doc block assets'
    ) THEN
        CREATE POLICY "Authenticated manage doc block assets" ON storage.objects
            FOR ALL
            USING (
                bucket_id = 'doc-block-assets'
                AND (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL)
            )
            WITH CHECK (
                bucket_id = 'doc-block-assets'
                AND (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL)
            );
    END IF;
END $$;

commit;
