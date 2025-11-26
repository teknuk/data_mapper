import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html'
      },
      output: {
        entryFileNames: `popup.js`,
        assetFileNames: `popup.[ext]`,
        chunkFileNames: `popup.[hash].js`
      }
    }
  }
});
