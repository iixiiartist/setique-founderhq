/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isElectron = env.VITE_ELECTRON === 'true';
    
    // Only upload source maps in production builds with Sentry configured
    const enableSentry = mode === 'production' && env.VITE_SENTRY_DSN && env.SENTRY_AUTH_TOKEN;
    
    return {
      base: isElectron ? './' : '/', // Conditional base path for Electron vs Web
      server: {
        port: 3001,
        host: '0.0.0.0',
        strictPort: false, // Allow fallback to other ports
      },
      plugins: [
        react(),
        // Upload source maps to Sentry (only in production with auth token)
        enableSentry && sentryVitePlugin({
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN,
          telemetry: false,
          sourcemaps: {
            assets: './dist/**',
            filesToDeleteAfterUpload: ['./dist/**/*.map'], // Clean up source maps after upload
          },
        }),
      ].filter(Boolean),
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext',
        minify: 'terser',
        outDir: 'dist',
        sourcemap: mode === 'production' ? 'hidden' : true, // Enable source maps for debugging
        rollupOptions: {
          output: {
            // SIMPLIFIED: Keep all node_modules in ONE vendor chunk
            // This prevents ANY cross-chunk dependency issues
            manualChunks: (id) => {
              // All node_modules go into ONE vendor chunk
              if (id.includes('node_modules')) {
                return 'vendor';
              }
              
              // Component-level code splitting (lazy loaded tabs)
              if (id.includes('/components/CrmTab')) {
                return 'crm-tab';
              }
              if (id.includes('/components/MarketingTab')) {
                return 'marketing-tab';
              }
              if (id.includes('/components/FinancialsTab')) {
                return 'financials-tab';
              }
              if (id.includes('/components/CalendarTab')) {
                return 'calendar-tab';
              }
              if (id.includes('/components/FileLibraryTab')) {
                return 'file-library-tab';
              }
              if (id.includes('/components/AdminTab')) {
                return 'admin-tab';
              }
              if (id.includes('/components/AchievementsTab')) {
                return 'achievements-tab';
              }
              if (id.includes('/components/PlatformTab')) {
                return 'platform-tab';
              }
              if (id.includes('/components/SettingsTab')) {
                return 'settings-tab';
              }
            }
          }
        }
      },
      test: {
        globals: true,
        environment: 'node',
        setupFiles: (process.env.TEST_TYPE === 'rls') ? ['./tests/rls/setup.ts'] : [],
        testMatch: ['**/tests/**/*.test.ts'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          include: ['lib/**/*.ts', 'hooks/**/*.ts'],
          exclude: ['**/*.d.ts', '**/*.test.ts', '**/node_modules/**'],
        },
      }
    };
});
// Cache bust 1762567800
