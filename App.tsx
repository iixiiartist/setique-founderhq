import React, { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { LoginForm } from './components/auth/LoginForm'
import { FullPageLoading } from './components/shared/Loading'
import { InviteAcceptPage } from './components/shared/InviteAcceptPage'
import DashboardApp from './DashboardApp'

const App: React.FC = () => {
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
          window.location.href = '/' // Reload to proper state
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