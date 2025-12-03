// vite.content.config.js
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
        content: path.resolve(__dirname, 'src/content-script.js')
      },
      output: {
        entryFileNames: () => 'content-script.js',
        chunkFileNames: 'content-script.js', // prevent extra chunks
        format: 'iife'
      }
    }
  }
});
