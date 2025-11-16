import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { AuthService } from '../lib/services/auth'
import { logger } from '../lib/logger'
import { SecureStorage, StorageKeys } from '../lib/utils/secureStorage'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface Props {
  children: React.ReactNode
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { session, error } = await AuthService.getCurrentSession()
        if (!error && session) {
          setSession(session)
          setUser(session.user)
        }
      } catch (error) {
        logger.error('Failed to get initial session', { error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(
      async (event, session) => {
        logger.info('Auth state changed', { 
          event, 
          userId: session?.user?.id, 
          hasSession: !!session,
          expiresAt: session?.expires_at 
        })
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Don't set global loading state - let the form handle its own loading UI
    const result = await AuthService.signUp(email, password, fullName)
    return result
  }

  const signIn = async (email: string, password: string) => {
    // Don't set global loading state - let the form handle its own loading UI  
    const result = await AuthService.signIn(email, password)
    return result
  }

  const signOut = async () => {
    setLoading(true)
    try {
      // Clear all sensitive localStorage before sign out
      SecureStorage.removeItem(StorageKeys.BUSINESS_PROFILE_DRAFT);
      SecureStorage.removeItem(StorageKeys.ASSISTANT_STATE);
      
      // Clear all conversation history
      SecureStorage.clearPrefix(StorageKeys.CONVERSATION_HISTORY);
      
      // Clear any onboarding dismissal flags
      Object.keys(localStorage).forEach(key => {
        if (key.includes('onboarding_dismissed_')) {
          localStorage.removeItem(key);
        }
      });
      
      logger.debug('Sensitive storage cleared on logout');
      
      const result = await AuthService.signOut()
      return result
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    return await AuthService.resetPassword(email)
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}