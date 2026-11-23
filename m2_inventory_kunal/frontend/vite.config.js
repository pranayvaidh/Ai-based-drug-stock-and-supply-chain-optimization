import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Single Vite app for the whole project (decision D1).
// Member UI code lives in its owner's folder and is pulled in via aliases.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@m1': path.resolve(repoRoot, 'm1_auth_lucky/frontend'),
      '@m2': path.resolve(__dirname, 'src'),
      '@m4': path.resolve(repoRoot, 'm4_dashboard_pranay/frontend'),
    },
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.js'),
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [repoRoot] },
    proxy: {
      // Browser calls /api/... ; Vite forwards to Flask on 5050 without the /api prefix.
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  preview: { port: 5173 },
  build: {
    outDir: path.resolve(repoRoot, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
});
