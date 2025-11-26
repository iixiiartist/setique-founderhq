# doc-block-assets Bucket Setup

Signature nodes and future structured blocks store generated PNGs in the `doc-block-assets` Supabase Storage bucket. Run the SQL helper and verify policies before deploying to production.

## 1. Prerequisites

- Supabase project (dev/staging/prod) with owner access.
- Supabase CLI authenticated via `supabase login` **or** access to the dashboard SQL editor.
- This repository cloned locally so you can reference `create_doc_block_assets_bucket.sql`.

## 2. Provision the bucket

### Option A – Supabase dashboard

1. Open the Supabase dashboard → **SQL Editor**.
2. Paste the contents of `create_doc_block_assets_bucket.sql` from this repo root.
3. Execute the script once per environment (dev/staging/prod).

### Option B – Supabase CLI

```bash
cd path/to/setique-founderhq
supabase link --project-ref your-ref # once per machine
supabase db execute create_doc_block_assets_bucket.sql
```

The script:

- Creates the bucket if missing (10 MB max per object, `image/png` only).
- Enables public reads so saved signatures can render in shared canvases.
- Adds a single policy that lets authenticated users upload/update/delete within this bucket.

## 3. Validate settings

After running the script, run the quick checks below (either via SQL editor or CLI):

```sql
-- Bucket exists + is public
select id, public from storage.buckets where id = 'doc-block-assets';

-- Policies are installed
select policyname, command from pg_policies where tablename = 'objects' and policyname like '%doc block assets%';
```

Then confirm visually inside **Storage → doc-block-assets**:

- ⚙️ **Public bucket** toggle should be ON.
- ✅ **Allowed mime types**: `image/png` (add more if you support new asset types later).
- 🔐 **Policies**: expect "Public read doc block assets" and "Authenticated manage doc block assets".

## 4. Troubleshooting & roll-forward guidance

- Include this script in your Supabase change-management runbooks so the bucket ships with infrastructure migrations.
- If you need stricter controls (e.g., private signatures), disable public read and update the Signature node to fetch via signed URLs instead.
- Future structured blocks can reuse the same bucket; extend the allowed MIME type list and update policies if access requirements change.
- If a deployment fails midway, simply re-run `create_doc_block_assets_bucket.sql`; it is idempotent and will only add missing resources/policies.
