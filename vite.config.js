import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'date-fns': path.resolve(__dirname, './node_modules/date-fns'),
    },
  },
  optimizeDeps: {
    include: [
      'date-fns',
      'date-fns/_lib/format/longFormatters',
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'firebase-messaging-sw': path.resolve(__dirname, 'public/firebase-messaging-sw.js')
      }
    }
  },
  define: {
    'process.env': process.env
  }
});
