import { defineConfig } from 'astro/config';

// Deployment target is configurable so the same repo works on GitHub Pages
// (project pages need a base path), Netlify, or a custom domain.
//   SITE_URL   e.g. https://armchairqbs.netlify.app  or  https://nick.github.io
//   BASE_PATH  e.g. /armchair-quarterbacks/   (GitHub project pages only; default "/")
const SITE_URL = process.env.SITE_URL || 'https://armchair-quarterbacks.example.com';
const BASE_PATH = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
