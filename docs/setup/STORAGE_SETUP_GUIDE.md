# Storage Bucket Setup Guide

## Quick Setup (Recommended)

### Step 1: Create Bucket via Supabase Dashboard

This is the **easiest and recommended** method:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx/storage/buckets

2. **Click "New bucket"** button

3. **Configure the bucket:**
   - **Name**: `workspace-images`
   - **Public bucket**: ✅ Check this (allows image URLs to work)
   - **File size limit**: `5` MB
   - **Allowed MIME types**: Click "Add type" for each:
     - `image/jpeg`
     - `image/png`
     - `image/webp`
     - `image/gif`

4. **Click "Create bucket"**

### Step 2: Add RLS Policies

After creating the bucket, you need to add security policies:

1. **Click on the `workspace-images` bucket** you just created

2. **Go to the "Policies" tab**

3. **Click "New Policy"** and create these 3 policies:

#### Policy 1: Upload Permission
- **Name**: `Users can upload to their workspace`
- **Policy Command**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'workspace-images' AND
(storage.foldername(name))[1] IN (
  SELECT w.id::text FROM workspaces w
  INNER JOIN workspace_members wm ON w.id = wm.workspace_id
  WHERE wm.user_id = auth.uid()
)
```

#### Policy 2: Public Read Access
- **Name**: `Images are publicly readable`
- **Policy Command**: `SELECT`
- **Target roles**: `public`
- **USING expression**:
```sql
bucket_id = 'workspace-images'
```

#### Policy 3: Delete Permission
- **Name**: `Users can delete their workspace images`
- **Policy Command**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'workspace-images' AND
(storage.foldername(name))[1] IN (
  SELECT w.id::text FROM workspaces w
  INNER JOIN workspace_members wm ON w.id = wm.workspace_id
  WHERE wm.user_id = auth.uid()
)
```

4. **Click "Save policy"** for each one

### Step 3: Verify Setup

After creating bucket and policies, verify:

1. **Check bucket configuration**:
   - Go to Storage → workspace-images
   - Settings should show:
     - Public: ✅ Yes
     - File size limit: 5 MB
     - Allowed types: 4 types (JPEG, PNG, WebP, GIF)

2. **Check policies**:
   - Go to Policies tab
   - Should see 3 policies (green checkmarks):
     - ✅ Users can upload to their workspace (INSERT)
     - ✅ Images are publicly readable (SELECT)
     - ✅ Users can delete their workspace images (DELETE)

3. **Test upload** (after starting dev server):
   - Open a GTM document
   - Click Insert Image → Drag an image
   - Should upload successfully

---

## Alternative: Programmatic Setup

If you prefer using a script (requires Service Role Key):

### Prerequisites

Add to your `.env` file:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get the key from: https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx/settings/api

⚠️ **Warning**: Keep this key secret! Never commit it to git.

### Run Setup Script

```bash
# Install tsx if needed
npm install -D tsx

# Run the setup script
npx tsx scripts/setup-storage.ts
```

This will create the bucket, but you **still need to add the RLS policies manually** via the dashboard (Step 2 above).

---

## Troubleshooting

### "Bucket already exists"
- ✅ This is fine! Skip to Step 2 (RLS policies)
- Or verify existing bucket has correct settings

### "Permission denied" when uploading
- ❌ RLS policies not configured correctly
- Check that all 3 policies are active (green checkmark)
- Verify policy SQL expressions match exactly

### "File too large" error
- ❌ File exceeds 5MB limit
- Try compressing the image first
- Or use URL import for external images

### "Invalid MIME type" error
- ❌ File type not allowed
- Only JPEG, PNG, WebP, GIF supported
- Convert file to supported format

### Images not displaying
- ❌ Bucket not set to "public"
- Go to bucket settings → Make sure "Public bucket" is checked
- Re-upload the image after fixing

### "Must be owner of table objects" SQL error
- ❌ Don't run `SETUP_STORAGE_BUCKET.sql` in terminal
- ✅ Use Supabase Dashboard method instead (recommended)
- The SQL file was for reference but requires superuser access

---

## Next Steps

Once storage is set up:

1. ✅ Start dev server: `npm run dev`
2. ✅ Open a GTM document
3. ✅ Test image upload (click Insert Image)
4. ✅ Test drag-drop functionality
5. ✅ Test image resize/crop features

See **EDITOR_ENHANCEMENTS_GUIDE.md** for complete testing instructions.

---

## Security Notes

- ✅ Only workspace members can upload to their workspace folder
- ✅ Images are public (required for document sharing)
- ✅ Only workspace members can delete their images
- ✅ Files organized by workspaceId to prevent conflicts
- ✅ 5MB limit enforced at bucket level
- ✅ MIME type validation prevents non-image uploads

---

**Last Updated**: November 13, 2025  
**Setup Time**: ~5 minutes via dashboard
