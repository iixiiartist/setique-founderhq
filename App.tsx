import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { LoginForm } from './components/auth/LoginForm'
import { FullPageLoading } from './components/shared/Loading'
import { InviteAcceptPage } from './components/shared/InviteAcceptPage'
import { LandingPage } from './components/LandingPage'
import DashboardApp from './DashboardApp'

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* App routes (requires auth) */}
        <Route path="/app/*" element={<AppRoutes />} />
        
        {/* Redirect old root to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

// Protected app routes
function AppRoutes() {
  const { user, loading } = useAuth()
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  useEffect(() => {
    // Check for invitation token in URL
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    if (token) {
      setInviteToken(token)
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
      <DashboardApp />
    </WorkspaceProvider>
  )
}

export default App