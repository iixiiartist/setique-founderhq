#!/usr/bin/env node
/**
 * Apply storage bucket migration
 * This script creates the workspace-images bucket and RLS policies
 * 
 * Run: node scripts/apply-storage-migration.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL not found in environment')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  console.error('   Get it from: https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx/settings/api')
  console.error('   Add to .env: SUPABASE_SERVICE_ROLE_KEY=your_key_here')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Applying storage bucket migration...\n')

  try {
    // Step 1: Create the bucket using Storage API
    console.log('📦 Creating workspace-images bucket...')
    
    const { data: existingBuckets } = await supabase.storage.listBuckets()
    const bucketExists = existingBuckets?.some(b => b.id === 'workspace-images')
    
    if (bucketExists) {
      console.log('✅ Bucket "workspace-images" already exists')
    } else {
      const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('workspace-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      })

      if (bucketError) {
        console.error('❌ Failed to create bucket:', bucketError.message)
        process.exit(1)
      }

      console.log('✅ Bucket created successfully!')
    }

    // Step 2: Apply RLS policies using SQL
    console.log('\n📝 Applying RLS policies...')
    
    const policies = [
      {
        name: 'Users can upload to their workspace',
        sql: `
          CREATE POLICY IF NOT EXISTS "Users can upload to their workspace"
          ON storage.objects
          FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = 'workspace-images'
            AND (storage.foldername(name))[1] IN (
              SELECT w.id::text 
              FROM workspaces w
              INNER JOIN workspace_members wm ON w.id = wm.workspace_id
              WHERE wm.user_id = auth.uid()
            )
          );
        `
      },
      {
        name: 'Images are publicly readable',
        sql: `
          CREATE POLICY IF NOT EXISTS "Images are publicly readable"
          ON storage.objects
          FOR SELECT
          TO public
          USING (bucket_id = 'workspace-images');
        `
      },
      {
        name: 'Users can delete their workspace images',
        sql: `
          CREATE POLICY IF NOT EXISTS "Users can delete their workspace images"
          ON storage.objects
          FOR DELETE
          TO authenticated
          USING (
            bucket_id = 'workspace-images'
            AND (storage.foldername(name))[1] IN (
              SELECT w.id::text 
              FROM workspaces w
              INNER JOIN workspace_members wm ON w.id = wm.workspace_id
              WHERE wm.user_id = auth.uid()
            )
          );
        `
      }
    ]

    // Execute each policy creation
    for (const policy of policies) {
      console.log(`  - Creating policy: "${policy.name}"`)
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: policy.sql })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`    ⚠️  Note: ${errorText}`)
        console.log(`    ℹ️  This may be expected if policies need to be created via Supabase Dashboard`)
      } else {
        console.log(`    ✅ Policy created`)
      }
    }

    console.log('\n⚠️  IMPORTANT: RLS policies may require manual setup via Supabase Dashboard')
    console.log('   See STORAGE_SETUP_GUIDE.md for detailed instructions')
    console.log('\n📦 Verifying bucket creation...')

    // Verify bucket was created
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message)
    } else {
      const workspaceBucket = buckets.find(b => b.id === 'workspace-images')
      if (workspaceBucket) {
        console.log('✅ Bucket "workspace-images" created:')
        console.log('   - Public:', workspaceBucket.public)
        console.log('   - Created:', workspaceBucket.created_at)
        console.log('   - File size limit: 5MB')
        console.log('   - Allowed types: JPEG, PNG, WebP, GIF')
      } else {
        console.log('⚠️  Bucket not found in list, but migration may have succeeded')
      }
    }

    console.log('\n✨ Setup complete! You can now test image uploads.')

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

applyMigration()
