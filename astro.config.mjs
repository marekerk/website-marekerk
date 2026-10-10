import { defineConfig } from 'astro/config';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const owner = process.env.GITHUB_REPOSITORY?.split('/')[0] ?? '';
const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

const site = process.env.SITE_URL || (owner ? `https://${owner}.github.io` : 'http://localhost:4321');
const base = process.env.SITE_URL ? '' : (isGithubPages && repo ? `/${repo}` : '');

export default defineConfig({
  site,
  base,
});
