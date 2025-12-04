import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const terserProdOptions = {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          format: {
            comments: false,
          },
          mangle: true,
        };

  return {
    base: './', // important! makes all paths relative
    plugins: [svelte()],
    publicDir: false,
    build: {
      outDir: 'dist/panel',
      emptyOutDir: true,
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ?  terserProdOptions : {},
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          // important: fixed filenames (no hashing)
          entryFileNames: 'panel.js',
          chunkFileNames: 'panel.js',
          assetFileNames: asset => {
            if (asset.names?.some(n => n.endsWith('.css'))) return 'panel.css'; // Detect CSS output
            return '[name][extname]'; // Default: preserve name
          },
        },
      },
    },
  }
});
