import env, { IS_DEV, IS_PROD } from '@extension/env';
import { watchRebuildPlugin } from '@extension/hmr';
import react from '@vitejs/plugin-react-swc';
import deepmerge from 'deepmerge';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import type { UserConfig } from 'vite';

export const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined;

export const withPageConfig = (config: UserConfig) =>
  defineConfig(
    deepmerge(
      deepmerge(
        {
          define: {
            'process.env': env,
          },
          base: '',
          plugins: [react(), IS_DEV && watchRebuildPlugin({ refresh: true }), nodePolyfills()],
          build: {
            sourcemap: IS_DEV,
            minify: IS_PROD,
            reportCompressedSize: IS_PROD,
            emptyOutDir: IS_PROD,
            watch: watchOption,
            rollupOptions: {
              external: ['chrome'],
            },
          },
        },
        // for sqlocal usage
        {
          optimizeDeps: {
            exclude: ['sqlocal'],
          },
          worker: {
            format: 'es',
          },
          plugins: [
            {
              name: 'configure-response-headers',
              configureServer: server => {
                server.middlewares.use((_req, res, next) => {
                  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
                  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
                  next();
                });
              },
            },
          ],
        },
      ),
      config,
    ),
  );
