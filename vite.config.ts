import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Note: @sentry/vite-plugin is not in package.json, so disabling it for now to prevent build errors.
// import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // sentryVitePlugin({
      //   org: env.VITE_SENTRY_ORG,
      //   project: env.VITE_SENTRY_PROJECT,
      //   authToken: env.VITE_SENTRY_AUTH_TOKEN,
      //   disable: mode === 'development',
      //   silent: true,
      // }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '@supabase/supabase-js': '@supabase/supabase-js/dist/module/index.js',
      },
    },
    define: {
      'process.env': env
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      globals: true,
      exclude: ['e2e/**', 'playwright-report/**', 'node_modules/**'],
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
