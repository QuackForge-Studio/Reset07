import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Build-time version for cache-busting the service worker URL.
const APP_VERSION = (() => {
  try {
    return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version ?? 'v1';
  } catch {
    return 'v1';
  }
})();

export default defineConfig({
  // `base: './'` keeps the build portable: the game can be served from a
  // sub-directory (itch.io, GitHub Pages, CDN) without rewriting asset paths.
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
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
