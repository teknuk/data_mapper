import { defineConfig } from 'vite';
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
    publicDir: false,
    build: {
      outDir: 'dist/content-script',
      emptyOutDir: false,
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ?  terserProdOptions : {},
      rollupOptions: {
        input: {
          content: path.resolve(__dirname, 'src/content-script.js'),
        },
        output: {
          entryFileNames: () => 'content-script.js',
          chunkFileNames: 'content-script.js', // prevent extra chunks
          format: 'iife',
        },
      },
    },
  }
});
