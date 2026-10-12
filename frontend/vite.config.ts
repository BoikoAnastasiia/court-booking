/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev, forward API calls to the backend (nginx does this in Docker).
    proxy: { '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:4000', ws: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
