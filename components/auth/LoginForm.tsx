import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { normalizeEmail } from '../../lib/utils/emailHelpers'
import { supabase } from '../../lib/supabase'
import { sanitizeAuthError } from '../../lib/utils/errorMessages'
import { useAnalytics } from '../../hooks/useAnalytics'
import { AlertTriangle, CheckCircle2, Mail } from 'lucide-react'

interface Props {
  onSuccess?: () => void
}

export const LoginForm: React.FC<Props> = ({ onSuccess }) => {
  const [email, setEmail] = useState(() => {
    // Check for prefilled email from invite acceptance flow
    const storedEmail = sessionStorage.getItem('auth_prefill_email')
    if (storedEmail) {
      sessionStorage.removeItem('auth_prefill_email')
      return storedEmail
    }
    return ''
  })
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    // Restore error from sessionStorage if component remounts
    const savedError = sessionStorage.getItem('auth_error')
    if (savedError) {
      sessionStorage.removeItem('auth_error')
      return savedError
    }
    return null
  })
  const [message, setMessage] = useState<string | null>(() => {
    // Restore message from sessionStorage if component remounts
    const savedMessage = sessionStorage.getItem('auth_message')
    if (savedMessage) {
      sessionStorage.removeItem('auth_message')
      return savedMessage
    }
    return null
  })
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  const { signIn, signUp, resetPassword } = useAuth()
  const { track, trackError } = useAnalytics()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submissions
    if (loading) return
    
    setLoading(true)
    setError(null)
    setMessage(null)
    sessionStorage.removeItem('auth_error')
    sessionStorage.removeItem('auth_message')

    try {
      // Normalize email and trim name for consistency
      const normalizedEmail = normalizeEmail(email)
      const trimmedName = fullName.trim()
      
      // Validate password strength for sign-up
      if (isSignUp) {
        if (password.length < 8) {
          setError('Password must be at least 8 characters long');
          setLoading(false);
          return;
        }
        if (!/[a-z]/.test(password)) {
          setError('Password must contain at least one lowercase letter');
          setLoading(false);
          return;
        }
        if (!/[A-Z]/.test(password)) {
          setError('Password must contain at least one uppercase letter');
          setLoading(false);
          return;
        }
        if (!/[0-9]/.test(password)) {
          setError('Password must contain at least one number');
          setLoading(false);
          return;
        }
      }
      
      if (isSignUp) {
        track('signup_attempt', { method: 'email' })
        const { data, error } = await signUp(normalizedEmail, password, trimmedName)
        if (process.env.NODE_ENV === 'development') {
          console.log('SignUp result:', { data, error })
        }
        if (error) {
          // Use sanitized error messages
          const errorMsg = sanitizeAuthError(error)
          setError(errorMsg)
          sessionStorage.setItem('auth_error', errorMsg)
          setLoading(false)
          track('signup_failed', { error: errorMsg })
          trackError(error, { context: 'signup', email: normalizedEmail })
        } else {
          setAwaitingConfirmation(true)
          const successMsg = 'Account created! Check your email and click the confirmation link to complete your signup. The email should arrive within a few minutes.'
          setMessage(successMsg)
          sessionStorage.setItem('auth_message', successMsg)
          setLoading(false)
          track('signup_success', { method: 'email' })
          // Keep them on signup view but disable switching
        }
      } else {
        track('login_attempt', { method: 'email' })
        const { data, error } = await signIn(normalizedEmail, password)
        if (process.env.NODE_ENV === 'development') {
          console.log('SignIn result:', { data, error })
        }
        if (error) {
          // Use sanitized error messages
          const errorMsg = sanitizeAuthError(error)
          
          // Check if needs email confirmation
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setAwaitingConfirmation(true)
          }
          
          setError(errorMsg)
          sessionStorage.setItem('auth_error', errorMsg)
          setLoading(false)
          track('login_failed', { error: errorMsg })
          trackError(error, { context: 'login', email: normalizedEmail })
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('Sign in successful')
          }
          const successMsg = 'Sign in successful! Loading your dashboard...'
          setMessage(successMsg)
          sessionStorage.setItem('auth_message', successMsg)
          track('login_success', { method: 'email' })
          // Small delay to show success message
          await new Promise(resolve => setTimeout(resolve, 800))
          setLoading(false)
          onSuccess?.()
        }
      }
    } catch (err: any) {
      console.error('Exception during auth:', err)
      const errorMsg = sanitizeAuthError(err)
      setError(errorMsg)
      sessionStorage.setItem('auth_error', errorMsg)
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const normalizedEmail = normalizeEmail(email)
      const { error } = await resetPassword(normalizedEmail)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Password reset email sent! Check your inbox for the reset link.')
      }
    } catch (err) {
      setError(sanitizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const normalizedEmail = normalizeEmail(email)
      
      // Use Supabase's resend method to actually resend the confirmation email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
      })

      if (error) {
        setError(sanitizeAuthError(error))
      } else {
        setMessage('Confirmation email resent! Check your inbox (and spam folder).')
      }
    } catch (err) {
      setError(sanitizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-t-2xl">
          <h1 className="text-3xl font-bold text-white text-center">
            Setique: FounderHQ
          </h1>
          <p className="text-slate-300 text-center text-sm mt-2">
            Your Lightweight GTM Hub
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-b-2xl p-8 shadow-xl border border-gray-200 border-t-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isSignUp ? 'Get started with your free account' : 'Welcome back!'}
            </p>
          </div>
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  required={isSignUp}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-sm transition-colors"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-sm transition-colors"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-sm transition-colors"
                placeholder={isSignUp ? "Min. 8 chars, mixed case, numbers" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                  <div className="text-sm font-medium text-red-800">{error}</div>
                </div>
              </div>
            )}

            {message && (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <div className="text-sm font-medium text-emerald-800">{message}</div>
                </div>
                {awaitingConfirmation && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <p className="text-xs text-emerald-700 mb-2">
                      Didn't receive the email?
                    </p>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={loading}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline"
                    >
                      Resend confirmation email
                    </button>
                  </div>
                )}
              </div>
            )}

            {!awaitingConfirmation && (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-slate-900 rounded-xl font-semibold text-white hover:bg-slate-800 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            )}

            {awaitingConfirmation && (
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> <strong>Check your email!</strong>
                </p>
                <p className="text-xs text-slate-600 mb-2">
                  We sent a confirmation link to <strong>{email}</strong>
                </p>
                <p className="text-xs text-slate-500">
                  Click the link in the email to activate your account, then come back here to sign in.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              {!awaitingConfirmation && (
                <button
                  type="button"
                  className="text-sm text-slate-700 hover:text-slate-900 font-medium"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError(null)
                    setMessage(null)
                    setAwaitingConfirmation(false)
                  }}
                >
                  {isSignUp ? '← Back to Sign In' : 'Create Account →'}
                </button>
              )}
              
              {awaitingConfirmation && (
                <button
                  type="button"
                  className="text-sm text-slate-700 hover:text-slate-900 font-medium"
                  onClick={() => {
                    setAwaitingConfirmation(false)
                    setIsSignUp(false)
                    setError(null)
                    setMessage(null)
                  }}
                >
                  ← Back to Sign In
                </button>
              )}

              {!isSignUp && !awaitingConfirmation && (
                <button
                  type="button"
                  className="text-sm text-slate-500 hover:text-slate-700"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}