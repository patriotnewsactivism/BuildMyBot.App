import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// This config is used for Vitest only. The app uses Next.js for building/serving.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
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
  };
});
