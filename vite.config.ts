/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isElectron = env.VITE_ELECTRON === 'true';
    
    return {
      base: isElectron ? './' : '/', // Conditional base path for Electron vs Web
      server: {
        port: 3001,
        host: '0.0.0.0',
        strictPort: false, // Allow fallback to other ports
      },
      plugins: [react()],
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
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              // Core dependencies
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'vendor';
                }
                if (id.includes('@supabase')) {
                  return 'supabase';
                }
                if (id.includes('@tanstack/react-query')) {
                  return 'react-query';
                }
                if (id.includes('recharts') || id.includes('d3-')) {
                  return 'charts';
                }
                if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
                  return 'markdown';
                }
                if (id.includes('react-hot-toast')) {
                  return 'toast';
                }
                // All other node_modules go into libs chunk
                return 'libs';
              }
              
              // Component chunking for code splitting
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
        setupFiles: ['./tests/rls/setup.ts'],
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
