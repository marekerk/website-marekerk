import { defineConfig } from 'astro/config';

// Custom domain or the *.azurestaticapps.net hostname; the deploy workflow sets SITE_URL.
const site = process.env.SITE_URL || 'http://localhost:4321';

export default defineConfig({
  site,
});
