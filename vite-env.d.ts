/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENVIRONMENT: 'development' | 'production' | 'staging'
  readonly VITE_ANALYTICS_ID?: string
  readonly VITE_SENTRY_DSN?: string
  // Note: Groq API key is server-side only (GROQ_API_KEY in Supabase secrets)
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}