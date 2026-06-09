import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'leaflet';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'recharts';
          }
          if (id.includes('node_modules/socket.io-client')) {
            return 'socket';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/health': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
