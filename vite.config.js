import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { compression } from 'vite-plugin-compression2';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    base: './',

    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },

    server: {
      port: 5173,
      strictPort: false,
      open: true,
      host: true,
    },

    preview: {
      port: 4173,
    },

    build: {
      target: 'es2020',
      // Строка modulePreload удалена, она вызывала ошибку в Vite 6
      cssCodeSplit: true,
      sourcemap: !isProd,
      minify: 'esbuild',
      assetsDir: 'assets',
      rollupOptions: {
        external: ['fsevents'], // Защита от ошибки на Windows
        output: {
          manualChunks: {
            vendor: ['vite'],
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/chunk-[name]-[hash].js',
          assetFileNames: (info) => {
            if (/\.(png|jpe?g|svg|webp|gif|ico)$/.test(info.name ?? '')) {
              return 'assets/img/[name]-[hash][extname]';
            }
            if (/\.(woff2?|ttf|otf|eot)$/.test(info.name ?? '')) {
              return 'assets/font/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },

    plugins: [
      compression({ algorithm: 'brotliCompress', ext: '.br' }),
      compression({ algorithm: 'gzip', ext: '.gz' }),
    ],
  };
});
