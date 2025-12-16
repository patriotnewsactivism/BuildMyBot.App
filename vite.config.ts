import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      sentryVitePlugin({
        org: env.VITE_SENTRY_ORG,
        project: env.VITE_SENTRY_PROJECT,
        authToken: env.VITE_SENTRY_AUTH_TOKEN,
        disable: mode === 'development',
        silent: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': env
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      globals: true,
      exclude: ['**/node_modules/**', 'e2e/**'],
      server: {
        deps: {
          inline: ['@supabase/supabase-js']
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    server: {
      port: 8080
    },
  };
});
