import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isSingleFile = mode === 'singlefile';
  return {
    plugins: [
      svelte(),
      isSingleFile ? viteSingleFile() : null,
    ].filter(Boolean),
    server: {
      port: 5173,
    },
  };
});
