export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'Setique Founder Dashboard',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  
  // Feature flags
  features: {
    supabaseEnabled: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    groqEnabled: import.meta.env.VITE_GROQ_ENABLED === 'true',
    analyticsEnabled: !!import.meta.env.VITE_ANALYTICS_ID,
    sentryEnabled: !!import.meta.env.VITE_SENTRY_DSN,
  },

  api: {
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    groq: {
      // Groq API key remains server-side only (Supabase secret)
      edgeFunction: 'groq-chat',
      defaultModel: import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile',
    },
  },

  // Development helpers
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}

// Health check function
export const healthCheck = () => {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: APP_CONFIG.environment,
    version: APP_CONFIG.version,
    features: {
      supabase: APP_CONFIG.features.supabaseEnabled ? 'enabled' : 'disabled',
      groq: APP_CONFIG.features.groqEnabled ? 'enabled' : 'disabled',
      analytics: APP_CONFIG.features.analyticsEnabled ? 'enabled' : 'disabled',
      sentry: APP_CONFIG.features.sentryEnabled ? 'enabled' : 'disabled',
    },
    status: 'healthy'
  }

  // Log health check in development
  if (APP_CONFIG.isDevelopment) {
    console.log('🏥 Health Check:', checks)
  }

  return checks
}