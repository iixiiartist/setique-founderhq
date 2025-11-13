/**
 * Storage Bucket Setup Script
 * 
 * This script creates the workspace-images bucket programmatically.
 * Run this once to set up image storage for GTM Docs.
 * 
 * Usage: npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required:')
  console.error('  - VITE_SUPABASE_URL (found in .env)')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard > Settings > API)')
  console.error('\nAdd SUPABASE_SERVICE_ROLE_KEY to your .env file')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorageBucket() {
  console.log('🚀 Setting up workspace-images storage bucket...\n')

  try {
    // Step 1: Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      return
    }

    const existingBucket = buckets?.find(b => b.id === 'workspace-images')
    
    if (existingBucket) {
      console.log('✅ Bucket "workspace-images" already exists')
      console.log('   Created:', existingBucket.created_at)
      console.log('   Public:', existingBucket.public)
      console.log('\n⚠️  Skipping bucket creation (already exists)')
    } else {
      // Step 2: Create bucket
      console.log('📦 Creating workspace-images bucket...')
      
      const { data, error } = await supabase.storage.createBucket('workspace-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB in bytes
        allowedMimeTypes: [
          'image/jpeg',
          'image/png', 
          'image/webp',
          'image/gif'
        ]
      })

      if (error) {
        console.error('❌ Error creating bucket:', error.message)
        return
      }

      console.log('✅ Bucket created successfully!')
    }

    // Step 3: Instructions for RLS policies
    console.log('\n📋 IMPORTANT: RLS Policies Setup Required')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\nThe bucket is created, but you need to set up RLS policies manually:')
    console.log('\n1. Go to: https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx/storage/buckets/workspace-images')
    console.log('\n2. Click on "Policies" tab')
    console.log('\n3. Create these 3 policies:')
    console.log('\n   Policy 1: "Users can upload to their workspace"')
    console.log('   ─────────────────────────────────────────────')
    console.log('   Operation: INSERT')
    console.log('   Target roles: authenticated')
    console.log('   WITH CHECK expression:')
    console.log('   ```')
    console.log('   bucket_id = \'workspace-images\' AND')
    console.log('   (storage.foldername(name))[1] IN (')
    console.log('     SELECT w.id::text FROM workspaces w')
    console.log('     INNER JOIN workspace_members wm ON w.id = wm.workspace_id')
    console.log('     WHERE wm.user_id = auth.uid()')
    console.log('   )')
    console.log('   ```')
    console.log('\n   Policy 2: "Images are publicly readable"')
    console.log('   ─────────────────────────────────────────')
    console.log('   Operation: SELECT')
    console.log('   Target roles: public')
    console.log('   USING expression:')
    console.log('   ```')
    console.log('   bucket_id = \'workspace-images\'')
    console.log('   ```')
    console.log('\n   Policy 3: "Users can delete their workspace images"')
    console.log('   ──────────────────────────────────────────────────')
    console.log('   Operation: DELETE')
    console.log('   Target roles: authenticated')
    console.log('   USING expression:')
    console.log('   ```')
    console.log('   bucket_id = \'workspace-images\' AND')
    console.log('   (storage.foldername(name))[1] IN (')
    console.log('     SELECT w.id::text FROM workspaces w')
    console.log('     INNER JOIN workspace_members wm ON w.id = wm.workspace_id')
    console.log('     WHERE wm.user_id = auth.uid()')
    console.log('   )')
    console.log('   ```')
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✨ Setup complete! Add the policies via dashboard to finish.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

setupStorageBucket()
