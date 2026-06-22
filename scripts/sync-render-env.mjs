#!/usr/bin/env node
/**
 * Sync backend/.env vars to Render production service.
 * Usage: RENDER_API_KEY=rnd_xxx node scripts/sync-render-env.mjs
 * Get API key: https://dashboard.render.com/u/settings#api-keys
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(ROOT, 'backend/.env');

const RENDER_API_KEY = process.env.RENDER_API_KEY?.trim();
const SERVICE_NAME_HINT = process.env.RENDER_SERVICE_NAME || 'lifecare';

const SYNC_KEYS = [
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'BACKEND_URL',
  'GOOGLE_PLACES_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'ALLOW_DEMO_LOGIN',
  'USE_MEMORY_DB',
  'MEDISCAN_API_URL',
  'RAPIDCARE_WEBHOOK_SECRET',
];

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

async function renderFetch(path, options = {}) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`Render API ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function findService() {
  const list = await renderFetch('/services?limit=50');
  const services = Array.isArray(list) ? list : list?.services || [];
  const match = services.find((row) => {
    const name = (row.service?.name || row.name || '').toLowerCase();
    return name.includes(SERVICE_NAME_HINT.toLowerCase());
  });
  if (!match) {
    throw new Error(`No Render service matching "${SERVICE_NAME_HINT}". Set RENDER_SERVICE_NAME.`);
  }
  return match.service || match;
}

async function getEnvVars(serviceId) {
  const rows = await renderFetch(`/services/${serviceId}/env-vars`);
  const map = new Map();
  for (const row of rows) {
    const ev = row.envVar || row;
    map.set(ev.key, ev.value);
  }
  return map;
}

async function setEnvVar(serviceId, key, value) {
  await renderFetch(`/services/${serviceId}/env-vars`, {
    method: 'PUT',
    body: JSON.stringify([{ key, value }]),
  });
}

async function main() {
  if (!RENDER_API_KEY) {
    console.error('Missing RENDER_API_KEY. Get one at https://dashboard.render.com/u/settings#api-keys');
    process.exit(1);
  }

  const envContent = readFileSync(ENV_PATH, 'utf8');
  const local = parseEnvFile(envContent);

  const service = await findService();
  console.log(`Found Render service: ${service.name} (${service.id})`);

  const defaults = {
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://lifecare-frontend-navy.vercel.app',
    BACKEND_URL: 'https://lifecare-l42k.onrender.com',
    ALLOW_DEMO_LOGIN: 'true',
    USE_MEMORY_DB: 'false',
  };

  const toSet = {};
  for (const key of SYNC_KEYS) {
    const value = local[key] || defaults[key];
    if (value) toSet[key] = value;
  }

  if (!toSet.GOOGLE_PLACES_API_KEY && !toSet.GOOGLE_MAPS_API_KEY) {
    console.warn('Warning: no Google API key in backend/.env — hospital search will use OSM only.');
  }
  if (!toSet.TWILIO_ACCOUNT_SID) {
    console.warn('Warning: Twilio not in backend/.env — SOS SMS will log only until you add Twilio vars.');
  }
  if (!toSet.MONGODB_URI) {
    console.error('MONGODB_URI missing in backend/.env — Atlas required for persistent hospitals.');
    process.exit(1);
  }

  const current = await getEnvVars(service.id);
  let updated = 0;
  for (const [key, value] of Object.entries(toSet)) {
    if (current.get(key) === value) {
      console.log(`  skip ${key} (unchanged)`);
      continue;
    }
    await setEnvVar(service.id, key, value);
    console.log(`  set ${key}`);
    updated += 1;
  }

  if (updated > 0) {
    console.log(`\nUpdated ${updated} env var(s). Render will redeploy automatically.`);
  } else {
    console.log('\nAll env vars already up to date.');
  }

  console.log('\nVerify after deploy (~3 min):');
  console.log('  node scripts/verify-production.mjs');
  console.log('  curl -s https://lifecare-l42k.onrender.com/health');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
