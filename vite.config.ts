import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // `base: './'` keeps the build portable: the game can be served from a
  // sub-directory (itch.io, GitHub Pages, CDN) without rewriting asset paths.
  base: './',
  plugins: [react()],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
