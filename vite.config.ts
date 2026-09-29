import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works from any folder: GitHub Pages
  // serves it under /sortie/, and a zip upload (e.g. itch.io) works too.
  base: './',
  server: { open: false },
  build: { target: 'es2022' },
});
