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
    define: {
      'process.env': env
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
