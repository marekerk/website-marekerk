import { defineConfig } from 'astro/config';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const owner = process.env.GITHUB_REPOSITORY?.split('/')[0] ?? '';
const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

// For GitHub Pages project sites, Astro needs the repository name as `base`.
// For a custom domain, set SITE_URL in GitHub Actions and `base` becomes empty.
const site = process.env.SITE_URL || (owner ? `https://${owner}.github.io` : 'http://localhost:4321');
const base = process.env.SITE_URL ? '' : (isGithubPages && repo !== `${owner}.github.io` ? `/${repo}` : '');

export default defineConfig({
  site,
  base
});
