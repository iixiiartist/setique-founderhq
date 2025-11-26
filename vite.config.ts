/// <reference types="vitest" />
import path from 'path';
import fs from 'fs';
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
        strictPort: true, // Keep dashboard + Playwright aligned on a single port
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
      // Note: No API keys defined here - Groq key is server-side only
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'y-supabase': path.resolve(__dirname, 'node_modules/y-supabase/dist/index.js'),
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      },
      optimizeDeps: {
        include: [
          'react-colorful',
          'emoji-picker-react',
          'y-supabase',
          'yjs',
          '@tiptap/extension-collaboration',
          '@tiptap/extension-collaboration-cursor'
        ]
      },
      build: {
        target: 'es2020', // Changed from esnext for broader browser compatibility
        minify: 'terser',
        outDir: 'dist',
        sourcemap: mode === 'production' ? 'hidden' : true, // Enable source maps for debugging
        terserOptions: {
          compress: {
            drop_console: mode === 'production', // Strip all console.* in production
            drop_debugger: true,
            pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : []
          }
        },
        rollupOptions: {
          output: {
            // Split vendor chunks to reduce memory pressure during build
            // ORDER MATTERS: Check specific packages before generic patterns
            manualChunks: (id) => {
              if (id.includes('node_modules')) {
                // UI libraries FIRST (before react check, since lucide-react contains 'react')
                if (id.includes('lucide-react') || id.includes('recharts') || id.includes('date-fns') || id.includes('react-day-picker')) {
                  return 'vendor-ui';
                }
                // TipTap/ProseMirror (large) - check before react since some have 'react' in path
                if (id.includes('@tiptap') || id.includes('prosemirror') || id.includes('yjs') || id.includes('y-')) {
                  return 'vendor-editor';
                }
                // Supabase
                if (id.includes('@supabase')) {
                  return 'vendor-supabase';
                }
                // React core ecosystem (checked AFTER specific react-* packages)
                if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
                  return 'vendor-react';
                }
                // Everything else
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
        include: ['tests/**/*.test.ts'],
        exclude: ['tests/e2e/**'], // keep Playwright specs out of Vitest runs
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
