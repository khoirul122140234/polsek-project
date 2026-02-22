// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // baca env dari .env/.env.local (tanpa prefix filter)
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_BASE || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        // semua fetch ke /api ... diarahkan ke backend
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  };
});
  