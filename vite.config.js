import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  return {
    base: './',
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },
    server: {
      port: 5173,
      open: true,
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'esbuild',
      assetsDir: 'assets',
      rollupOptions: {
        external: ['fsevents', '../pkg'], 
        // =================================
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/chunk-[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
