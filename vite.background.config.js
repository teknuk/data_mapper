// vite.background.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: false,

    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src/service-worker.js')
      },
      output: {
        entryFileNames: () => 'service-worker.js',
        chunkFileNames: 'service-worker.js',
        format: 'iife'
      }
    }
  }
});
