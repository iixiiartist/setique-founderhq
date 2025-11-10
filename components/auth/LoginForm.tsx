import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { normalizeEmail } from '../../lib/utils/emailHelpers'
import { supabase } from '../../lib/supabase'
import { sanitizeAuthError } from '../../lib/utils/errorMessages'

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

  // Debug logging
  console.log('LoginForm render - error:', error, 'message:', message, 'loading:', loading)

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
      
      if (isSignUp) {
        const { data, error } = await signUp(normalizedEmail, password, trimmedName)
        console.log('SignUp result:', { data, error })
        if (error) {
          // Use sanitized error messages
          const errorMsg = sanitizeAuthError(error)
          setError(errorMsg)
          sessionStorage.setItem('auth_error', errorMsg)
          setLoading(false)
        } else {
          setAwaitingConfirmation(true)
          const successMsg = 'Account created! Check your email and click the confirmation link to complete your signup. The email should arrive within a few minutes.'
          setMessage(successMsg)
          sessionStorage.setItem('auth_message', successMsg)
          setLoading(false)
          // Keep them on signup view but disable switching
        }
      } else {
        const { data, error } = await signIn(normalizedEmail, password)
        console.log('SignIn result:', { data, error })
        if (error) {
          // Use sanitized error messages
          const errorMsg = sanitizeAuthError(error)
          
          // Check if needs email confirmation
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setAwaitingConfirmation(true)
          }
          
          console.log('Setting error message:', errorMsg)
          setError(errorMsg)
          sessionStorage.setItem('auth_error', errorMsg)
          console.log('Setting loading to false')
          setLoading(false)
          console.log('Error state should now be set')
        } else {
          console.log('Sign in successful, showing success message')
          const successMsg = 'Sign in successful! Loading your dashboard...'
          setMessage(successMsg)
          sessionStorage.setItem('auth_message', successMsg)
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
      setError('⚠️ Please enter your email address')
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
        <div className="bg-black p-6 border-2 border-black mb-0">
          <h1 className="text-3xl font-bold text-white font-mono text-center">
            FounderHQ
          </h1>
          <p className="text-yellow-400 text-center text-sm mt-2 font-mono">
            Your Lightweight GTM Hub
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border-2 border-t-0 border-black p-8 shadow-[8px_8px_0_rgba(0,0,0,1)]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-black font-mono">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="mt-1 text-sm text-gray-600 font-mono">
              {isSignUp ? 'Get started with your free account' : 'Welcome back!'}
            </p>
          </div>
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <div>
                <label className="block text-sm font-bold font-mono text-black mb-2">
                  Full Name
                </label>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  required={isSignUp}
                  className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-sm"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold font-mono text-black mb-2">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-sm"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold font-mono text-black mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-sm"
                placeholder={isSignUp ? "Min. 6 characters" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-none bg-red-50 p-4 border-2 border-red-600 shadow-[4px_4px_0_rgba(220,38,38,1)] animate-pulse">
                <div className="flex items-center">
                  <span className="text-red-600 text-2xl mr-3">❌</span>
                  <div className="text-base font-mono font-bold text-red-900">{error}</div>
                </div>
              </div>
            )}

            {message && (
              <div className="rounded-none bg-green-50 p-4 border-2 border-green-600 shadow-[4px_4px_0_rgba(22,163,74,1)]">
                <div className="flex items-center">
                  <span className="text-green-600 text-2xl mr-3">✅</span>
                  <div className="text-base font-mono font-bold text-green-900">{message}</div>
                </div>
                {awaitingConfirmation && (
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <p className="text-xs font-mono text-green-700 mb-2">
                      Didn't receive the email?
                    </p>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={loading}
                      className="text-xs font-mono font-bold text-green-700 hover:text-green-900 underline"
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
                className="w-full py-3 px-4 bg-yellow-400 border-2 border-black font-bold font-mono text-black hover:bg-yellow-300 transition-colors shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_rgba(0,0,0,1)] disabled:bg-gray-300"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    PROCESSING...
                  </span>
                ) : (
                  isSignUp ? 'CREATE ACCOUNT →' : 'SIGN IN →'
                )}
              </button>
            )}

            {awaitingConfirmation && (
              <div className="rounded-none bg-yellow-50 p-4 border-2 border-yellow-600">
                <p className="text-sm font-mono text-yellow-900 mb-3">
                  📧 <strong>Check your email!</strong>
                </p>
                <p className="text-xs font-mono text-yellow-800 mb-2">
                  We sent a confirmation link to <strong>{email}</strong>
                </p>
                <p className="text-xs font-mono text-yellow-700">
                  Click the link in the email to activate your account, then come back here to sign in.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
              {!awaitingConfirmation && (
                <button
                  type="button"
                  className="text-sm font-mono text-black hover:text-yellow-600 font-bold underline"
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
                  className="text-sm font-mono text-black hover:text-yellow-600 font-bold underline"
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
                  className="text-sm font-mono text-gray-600 hover:text-black underline"
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