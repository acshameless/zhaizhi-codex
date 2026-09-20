import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://zhaizhi.pages.dev',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
