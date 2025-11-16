import { supabase } from '../supabase'
import { AuthError, User, Session } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string, fullName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
          emailRedirectTo: `${window.location.origin}/app`,
        }
      })

      if (error) throw error

      // Profile will be created automatically by database trigger
      // No need to manually create it here

      return { data, error: null }
    } catch (error) {
      console.error('Error signing up:', error)
      return { data: null, error: error as AuthError }
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error signing in:', error)
      return { data: null, error: error as AuthError }
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error signing out:', error)
      return { error: error as AuthError }
    }
  }

  // Get current session
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return { session, error: null }
    } catch (error) {
      console.error('Error getting session:', error)
      return { session: null, error: error as AuthError }
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { user, error: null }
    } catch (error) {
      console.error('Error getting user:', error)
      return { user: null, error: error as AuthError }
    }
  }

  // Reset password
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error resetting password:', error)
      return { error: error as AuthError }
    }
  }

  // Update password
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error updating password:', error)
      return { error: error as AuthError }
    }
  }

  /**
   * Delete user account
   * 
   * SECURITY CRITICAL: This function calls a database RPC that must:
   * 1. Verify the user is authenticated (via RLS)
   * 2. Only allow users to delete their own account
   * 3. Cascade delete all user data (workspaces, profiles, etc.)
   * 
   * The RPC function 'delete_user_account' must be defined with:
   * - SECURITY DEFINER to access auth.users
   * - Proper authorization checks (user can only delete self)
   * - Transaction wrapping for data integrity
   * - Audit logging for compliance
   * 
   * @returns {Promise<{error: Error | null}>}
   */
  static async deleteAccount() {
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser()
      
      if (getUserError) {
        console.error('[Auth] Failed to get user for account deletion:', getUserError)
        throw new Error('Authentication required to delete account')
      }
      
      if (!user) {
        throw new Error('No user logged in')
      }

      console.log('[Auth] Initiating account deletion for user:', user.id)

      // Call secure RPC function that enforces authorization
      // This RPC must verify that the calling user matches the user being deleted
      const { error } = await supabase.rpc('delete_user_account')
      
      if (error) {
        console.error('[Auth] RPC delete_user_account failed:', error)
        
        // Provide user-friendly error messages
        if (error.code === 'PGRST116') {
          throw new Error('Account deletion is not available. Please contact support.')
        }
        
        throw new Error(`Failed to delete account: ${error.message}`)
      }

      console.log('[Auth] Account deleted successfully, signing out...')

      // Sign out after deletion
      await this.signOut()
      
      return { error: null }
    } catch (error) {
      console.error('[Auth] Error deleting account:', error)
      return { error: error as Error }
    }
  }

  // Create user profile after signup
  private static async createUserProfile(user: User, fullName?: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName || '',
          settings: {
            desktopNotifications: false,
          }
        })

      if (error) throw error
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  // Subscribe to auth changes
  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}