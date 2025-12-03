// vite.panel.config.js
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,

    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),

      output: {
        // important: fixed filenames (no hashing)
        entryFileNames: 'panel.js',
        chunkFileNames: 'panel.js',
        assetFileNames: asset => {
          if (asset.name.endsWith('.css')) return 'panel.css';
          return asset.name;
        },
      }
    }
  }
});
