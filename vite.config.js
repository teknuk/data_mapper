import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: path.resolve(__dirname, 'index.html'),
        content: path.resolve(__dirname, 'src/content-script.js'),
        background: path.resolve(__dirname, "src/service-worker.js"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') return 'content-script.js';
          if (chunk.name === 'panel') return 'panel.js';
          if (chunk.name === "background") return "service-worker.js";
          return '[name]-[hash].js';
        },
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some(n => n.endsWith('.css'))) { // Detect CSS output
            return 'panel.css';
          }
          return '[name][extname]'; // Default: preserve name
        }
      }
    }
  }
});
