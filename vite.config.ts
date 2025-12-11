import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve('./'),
      },
    },
    // SEC-016 FIX: Only expose safe environment variables to client
    // NEVER expose API keys - they must stay server-side only
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
      'process.env.VITE_ENABLE_DEMO_MODE': JSON.stringify(env.VITE_ENABLE_DEMO_MODE || 'false'),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    server: {
      port: 8080
    }
  };
});
