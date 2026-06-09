#!/usr/bin/env node
/**
 * Generate public/sitemap.xml for LifeCare+ SPA routes.
 * Run: npm run sitemap
 * Set SITE_URL env for production (default https://lifecare.plus)
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://lifecare.plus').replace(/\/$/, '');

const routes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/doctors', priority: '0.9', changefreq: 'daily' },
  { path: '/pharmacy', priority: '0.8', changefreq: 'weekly' },
  { path: '/ambulance', priority: '0.8', changefreq: 'weekly' },
  { path: '/login', priority: '0.5', changefreq: 'monthly' },
  { path: '/register', priority: '0.5', changefreq: 'monthly' },
];

const lastmod = new Date().toISOString().slice(0, 10);

const urls = routes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const outDir = join(root, 'public');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'sitemap.xml'), xml, 'utf8');
console.log(`Wrote public/sitemap.xml (${routes.length} URLs) → ${siteUrl}`);
