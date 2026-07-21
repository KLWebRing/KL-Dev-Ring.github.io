import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 5173,
    open: true,
    // Serve the built dist/ for /data/ and /builders/ routes in dev mode
    fs: {
      allow: ['..'],
    },
  },
  // In dev, serve static data from dist/ if it exists
  publicDir: 'public-app',
  build: {
    outDir: 'dist-app',
    sourcemap: true,
  },
});
