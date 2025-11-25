import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Soft validation - don't throw, return null client for graceful degradation
const validateConfig = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] Missing configuration');
    return false;
  }
  try {
    new URL(supabaseUrl);
    return true;
  } catch {
    console.error('[Supabase] Invalid URL format');
    return false;
  }
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    if (!validateConfig()) {
      throw new Error('Supabase not configured');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Refresh 60 seconds before expiry
        storageKey: 'fhq-auth',
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-client-info': 'founderhq-web'
        }
      }
    });
  }
  return supabaseInstance;
};

// Lazy export for backwards compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabase();
    return (client as any)[prop];
  }
});

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