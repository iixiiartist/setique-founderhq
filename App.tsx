import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { FeatureFlagProvider } from './contexts/FeatureFlagContext'
import { QueryProvider } from './lib/providers/QueryProvider'
import { Toaster } from './lib/utils/toast'
import { RateLimitAlert } from './components/shared/RateLimitAlert'
import { LoginForm } from './components/auth/LoginForm'
import { ResetPassword } from './components/auth/ResetPassword'
import { FullPageLoading } from './components/shared/Loading'
import { InviteAcceptPage } from './components/shared/InviteAcceptPage'
import { LandingPageRefactored as LandingPage } from './components/landing'
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage'
import { TermsOfServicePage } from './components/TermsOfServicePage'
import { CheckoutSuccessPage } from './components/CheckoutSuccessPage'
import { ApiDocsPage } from './pages/ApiDocsPage'
import { PublicFormPage } from './pages/PublicFormPage'
import { SharedReportPage } from './pages/SharedReportPage'
import { SharedBriefPage } from './pages/SharedBriefPage'
import DashboardApp from './DashboardApp'
import { initializeSentry, ErrorBoundary, ErrorFallback } from './lib/sentry.tsx'
import { analytics } from './lib/services/analytics'
import { usePageTracking, useUserTracking } from './hooks/useAnalytics'
import { ConsentBanner } from './components/shared/ConsentBanner'
import { AlertCircle, Link } from 'lucide-react'

// Initialize Sentry and Analytics as early as possible
initializeSentry();
analytics.initialize();

// Fallback component for malformed share links
function ShareLinkFallback() {
  const location = useLocation();
  const path = location.pathname;
  
  // Try to extract and redirect to the correct path
  // Handle cases like /share/brief (missing token) or /share/something-else
  const pathParts = path.split('/').filter(Boolean);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Share Link</h1>
        <p className="text-gray-600 mb-4">
          This share link appears to be incomplete or malformed.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Please check that you have the complete link and try again.
        </p>
        <div className="space-y-3">
          <a
            href="/"
            className="block w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Homepage
          </a>
        </div>
        {/* Debug info for troubleshooting */}
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-xs text-gray-400">Debug Info</summary>
          <pre className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-auto">
            Path: {path}
            Parts: {JSON.stringify(pathParts)}
          </pre>
        </details>
      </div>
    </div>
  );
}

// Component to handle both landing page and invite acceptance from root URL
function LandingOrInvite() {
  const navigate = useNavigate()
  const [inviteToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('token')
  })

  if (inviteToken) {
    return (
      <InviteAcceptPage 
        token={inviteToken} 
        onComplete={() => {
          navigate('/app', { replace: true })
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
          <AnalyticsIntegration />
          <Toaster />
          <RateLimitAlert />
          <ConsentBanner />
          <Routes>
          {/* Public landing page (also handles invite tokens) */}
          <Route path="/" element={<LandingOrInvite />} />
          
          {/* Legal pages */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          
          {/* API Documentation (public) */}
          <Route path="/docs" element={<ApiDocsPage />} />
          <Route path="/api-docs" element={<ApiDocsPage />} />
          
          {/* Public Forms (no auth required) */}
          <Route path="/forms/:slug" element={<PublicFormPage />} />
          
          {/* Shared Reports and Briefs (public, no auth required) */}
          <Route path="/share/report/:token" element={<SharedReportPage />} />
          <Route path="/share/brief/:token" element={<SharedBriefPage />} />
          {/* Catch-all for share links - handles malformed URLs */}
          <Route path="/share/*" element={<ShareLinkFallback />} />
          
          {/* Stripe checkout success */}
          <Route path="/success" element={<CheckoutSuccessPage />} />
          
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
  const navigate = useNavigate()
  return <ResetPassword onSuccess={() => navigate('/app', { replace: true })} />;
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

  const navigate = useNavigate()

  // If there's an invite token, show the invite acceptance page
  if (inviteToken) {
    return (
      <InviteAcceptPage 
        token={inviteToken} 
        onComplete={() => {
          setInviteToken(null)
          navigate('/app', { replace: true })
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
      <FeatureFlagProvider>
        <DashboardApp subscribePlan={subscribePlan || sessionStorage.getItem('pending_subscription')} />
      </FeatureFlagProvider>
    </WorkspaceProvider>
  )
}

// Component to integrate analytics tracking hooks
function AnalyticsIntegration() {
  usePageTracking();  // Auto-track page views on route changes
  useUserTracking();  // Auto-identify users on login/logout
  return null;
}

export default App