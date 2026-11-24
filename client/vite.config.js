import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` from the project root starts the Node API on :4000 and Vite on :5173.
// Vite forwards /api calls to the API, so the browser only ever talks to one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  build: { chunkSizeWarningLimit: 900 },
});
