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
          emailRedirectTo: window.location.origin,
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

  // Delete account
  static async deleteAccount() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user logged in')

      // Call Supabase Admin API to delete user
      // Note: This requires the service_role key or a custom edge function
      // For now, we'll use the auth.admin.deleteUser API
      const { error } = await supabase.rpc('delete_user_account')
      
      if (error) throw error

      // Sign out after deletion
      await this.signOut()
      
      return { error: null }
    } catch (error) {
      console.error('Error deleting account:', error)
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