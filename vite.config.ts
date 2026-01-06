import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';
import type { UserConfig } from 'vite';
import process from 'node:process';

const host = process.env.TAURI_DEV_HOST ?? false;

const config: UserConfig = {
  plugins: [tailwindcss(), sveltekit()],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. allow dynamic port allocation to support parallel development
  server: {
    port: 1420,
    strictPort: false,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
};

export default defineConfig(() => config);
