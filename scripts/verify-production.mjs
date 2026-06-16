#!/usr/bin/env node
/**
 * Quick production smoke test — Render API + Google + Vercel HTTPS.
 * Usage: node scripts/verify-production.mjs
 */
const BACKEND = 'https://lifecare-l42k.onrender.com';
const FRONTEND = 'https://lifecare-frontend-navy.vercel.app';

async function get(url) {
  const res = await fetch(url);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 120) };
}

async function main() {
  console.log('LifeCare+ production checks\n');

  const health = await get(`${BACKEND}/health`);
  const google = health.json?.integrations?.googlePlaces;
  console.log(`Render health: ${health.json?.status ?? health.status}`);
  console.log(`  Google Places API: ${google ? '✓ configured' : '✗ MISSING — run scripts/sync-render-env.mjs'}`);
  console.log(`  Database: ${health.json?.database?.connected ? '✓ connected' : '⚠ ' + (health.json?.database?.state ?? 'unknown')}`);

  const suggest = await get(`${BACKEND}/api/emergency/address-suggestions?q=chai%20loaded`);
  const count = suggest.json?.data?.suggestions?.length ?? 0;
  console.log(`\nAddress search (Chai Loaded): ${count > 0 ? `✓ ${count} results` : '✗ no results'}`);

  const feHead = await fetch(FRONTEND, { method: 'HEAD' });
  const https = feHead.url.startsWith('https://');
  const hsts = feHead.headers.get('strict-transport-security');
  console.log(`\nVercel frontend: ${https ? '✓ HTTPS' : '✗ not HTTPS'} (${FRONTEND})`);
  console.log(`  HSTS (GPS-friendly): ${hsts ? '✓ enabled' : '⚠ missing'}`);

  const feApi = await get(`${FRONTEND}/api/emergency/address-suggestions?q=medchal`);
  const apiWorks = feApi.json?.success === true;
  console.log(
    `  /api proxy to Render: ${apiWorks ? '✓ working' : '✗ returns HTML — redeploy Vercel after vercel.json fix'}`
  );

  if (!google) {
    console.log('\n→ Add GOOGLE_PLACES_API_KEY + GOOGLE_MAPS_API_KEY to Render, then redeploy.');
  }
  if (!apiWorks) {
    console.log('→ Push latest vercel.json + frontend/.env.production and redeploy on Vercel.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
