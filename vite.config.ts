import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      // Upload source maps to Sentry for better error tracking
      sentryVitePlugin({
        org: env.VITE_SENTRY_ORG,
        project: env.VITE_SENTRY_PROJECT,
        authToken: env.VITE_SENTRY_AUTH_TOKEN,
        disable: mode === 'development', // Don't upload source maps in dev
        silent: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('./'),
        '@supabase/supabase-js': '@supabase/supabase-js/dist/module/index.js',
      },
    },
    define: {
      'process.env': env
    },
    build: {
      outDir: 'dist',
      sourcemap: true // Enable source maps for Sentry error tracking
    },
    server: {
      port: 8080
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      globals: true
    }
  };
});
