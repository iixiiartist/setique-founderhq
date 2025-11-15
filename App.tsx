import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { QueryProvider } from './lib/providers/QueryProvider'
import { Toaster } from './lib/utils/toast'
import { LoginForm } from './components/auth/LoginForm'
import { ResetPassword } from './components/auth/ResetPassword'
import { FullPageLoading } from './components/shared/Loading'
import { InviteAcceptPage } from './components/shared/InviteAcceptPage'
import { LandingPage } from './components/LandingPage'
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage'
import { TermsOfServicePage } from './components/TermsOfServicePage'
import DashboardApp from './DashboardApp'
import { initializeSentry, ErrorBoundary, ErrorFallback } from './lib/sentry.tsx'

// Initialize Sentry as early as possible
initializeSentry();

// Component to handle both landing page and invite acceptance from root URL
function LandingOrInvite() {
  const [inviteToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('token')
  })

  if (inviteToken) {
    return (
      <InviteAcceptPage 
        token={inviteToken} 
        onComplete={() => {
          window.location.href = '/app'
        }}
      />
    )
  }

  return <LandingPage />
}

const App: React.FC = () => {
  return (
    <ErrorBoundary fallback={ErrorFallback} showDialog>
      <QueryProvider>
        <Router>
          <Toaster />
          <Routes>
          {/* Public landing page (also handles invite tokens) */}
          <Route path="/" element={<LandingOrInvite />} />
          
          {/* Legal pages */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          
          {/* Password reset (no auth required) */}
          <Route path="/reset-password" element={<ResetPasswordRoute />} />
          
          {/* App routes (requires auth) */}
          <Route path="/app/*" element={<AppRoutes />} />
          
          {/* Redirect old root to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </QueryProvider>
    </ErrorBoundary>
  )
}

// Password reset route (public)
function ResetPasswordRoute() {
  return <ResetPassword onSuccess={() => window.location.href = '/app'} />;
}

// Protected app routes
function AppRoutes() {
  const { user, loading } = useAuth()
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [subscribePlan, setSubscribePlan] = useState<string | null>(null)

  useEffect(() => {
    // Check for invitation token or subscribe plan in URL
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const plan = urlParams.get('subscribe')
    
    if (token) {
      setInviteToken(token)
    }
    
    if (plan) {
      setSubscribePlan(plan)
      // Store in sessionStorage so it persists during auth
      sessionStorage.setItem('pending_subscription', plan)
    }
  }, [])

  // If there's an invite token, show the invite acceptance page
  if (inviteToken) {
    return (
      <InviteAcceptPage 
        token={inviteToken} 
        onComplete={() => {
          setInviteToken(null)
          window.location.href = '/app' // Reload to app
        }}
      />
    )
  }

  if (loading) {
    return <FullPageLoading message="Loading your dashboard..." />
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <WorkspaceProvider>
      <DashboardApp subscribePlan={subscribePlan || sessionStorage.getItem('pending_subscription')} />
    </WorkspaceProvider>
  )
}

export default App