import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const outDir = process.env.ZHAIZHI_OUT_DIR ?? './dist';

export default defineConfig({
  site: 'https://zhaizhi-content.shameless.workers.dev',
  output: 'static',
  outDir,
  vite: {
    plugins: [tailwindcss()],
  },
});
