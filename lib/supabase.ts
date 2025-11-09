import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client with proper validation
const createSupabaseClient = () => {
  // Check for missing environment variables
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error(
      '❌ VITE_SUPABASE_URL is not configured.\n\n' +
      'Please add VITE_SUPABASE_URL to your .env file.\n' +
      'See .env.example for reference.'
    )
  }

  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    throw new Error(
      '❌ VITE_SUPABASE_ANON_KEY is not configured.\n\n' +
      'Please add VITE_SUPABASE_ANON_KEY to your .env file.\n' +
      'See .env.example for reference.'
    )
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error(
      `❌ VITE_SUPABASE_URL is invalid: "${supabaseUrl}"\n\n` +
      'Please provide a valid Supabase project URL.\n' +
      'Example: https://your-project.supabase.co'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

export const supabase = createSupabaseClient()

// Helper function to check if user is authenticated
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting current user:', error)
    throw error
  }
  return user
}

// Helper function to handle auth state changes
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}