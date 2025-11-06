import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  onSuccess?: () => void
}

export const LoginForm: React.FC<Props> = ({ onSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { signIn, signUp, resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await signUp(email, password, fullName)
        if (error) {
          // Provide user-friendly error messages
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please sign in instead.')
          } else if (error.message.includes('Password')) {
            setError('Password must be at least 6 characters long.')
          } else {
            setError(error.message)
          }
        } else {
          setMessage('✅ Account created! Please check your email to confirm your account before signing in.')
        }
      } else {
        const { data, error } = await signIn(email, password)
        if (error) {
          // Provide user-friendly error messages
          if (error.message.includes('Invalid login credentials')) {
            setError('❌ Invalid email or password. Please check your credentials and try again.')
          } else if (error.message.includes('Email not confirmed')) {
            setError('⚠️ Please confirm your email address. Check your inbox for the confirmation link.')
          } else if (error.message.includes('User not found')) {
            setError('❌ No account found with this email. Please sign up first.')
          } else {
            setError(error.message)
          }
        } else {
          setMessage('✅ Sign in successful! Redirecting to your dashboard...')
          onSuccess?.()
        }
      }
    } catch (err) {
      setError('⚠️ An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('⚠️ Please enter your email address first')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await resetPassword(email)
      if (error) {
        setError(error.message)
      } else {
        setMessage('✅ Password reset email sent! Check your inbox for the reset link.')
      }
    } catch (err) {
      setError('⚠️ An unexpected error occurred. Please try again.')
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
              <div className="rounded-none bg-red-50 p-4 border-2 border-red-600 shadow-[4px_4px_0_rgba(220,38,38,1)]">
                <div className="flex items-start">
                  <span className="text-red-600 text-xl mr-2">⚠️</span>
                  <div className="text-sm font-mono text-red-800">{error}</div>
                </div>
              </div>
            )}

            {message && (
              <div className="rounded-none bg-green-50 p-4 border-2 border-green-600 shadow-[4px_4px_0_rgba(22,163,74,1)]">
                <div className="flex items-start">
                  <span className="text-green-600 text-xl mr-2">✓</span>
                  <div className="text-sm font-mono text-green-800">{message}</div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-yellow-400 border-2 border-black font-bold font-mono text-black hover:bg-yellow-300 transition-colors shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_rgba(0,0,0,1)]"
            >
              {loading ? 'PROCESSING...' : (isSignUp ? 'CREATE ACCOUNT →' : 'SIGN IN →')}
            </button>

            <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
              <button
                type="button"
                className="text-sm font-mono text-black hover:text-yellow-600 font-bold underline"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setMessage(null)
                }}
              >
                {isSignUp ? '← Back to Sign In' : 'Create Account →'}
              </button>

              {!isSignUp && (
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