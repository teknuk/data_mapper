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
      outDir: 'dist/service-worker',
      emptyOutDir: false,
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ?  terserProdOptions : {},
      rollupOptions: {
        input: {
          background: path.resolve(__dirname, 'src/service-worker.js'),
        },
        output: {
          entryFileNames: () => 'service-worker.js',
          chunkFileNames: 'service-worker.js',
          format: 'es',
        },
      },
    },
  }
});
