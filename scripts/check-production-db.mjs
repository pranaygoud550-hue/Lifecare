#!/usr/bin/env node
/**
 * Fail if production API database is not connected.
 * Usage: npm run production:health
 * CI: runs on every push to main.
 */
const BACKEND = process.env.BACKEND_URL || 'https://lifecare-l42k.onrender.com';

async function main() {
  const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(45_000) });
  const body = await res.json();

  const connected = body?.database?.connected === true;
  const inMemory = body?.database?.inMemory === true;
  const status = body?.status;

  console.log(`Health: ${status}`);
  console.log(`  database.connected: ${connected}`);
  console.log(`  database.inMemory: ${inMemory}`);
  console.log(`  environment: ${body?.environment}`);

  if (!connected) {
    console.error('\n❌ Production database is OFFLINE.');
    console.error('   Fix: npm run db:verify  then  RENDER_API_KEY=... npm run production:sync');
    process.exit(1);
  }

  if (inMemory) {
    console.error('\n❌ Production is using in-memory DB — data will be lost on restart.');
    console.error('   Set USE_MEMORY_DB=false and MONGODB_URI on Render.');
    process.exit(1);
  }

  console.log('\n✅ Production database is online and persistent.');

  const demoRes = await fetch(`${BACKEND}/api/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210' }),
    signal: AbortSignal.timeout(60_000),
  });
  const demo = await demoRes.json();
  const demoOk = demoRes.ok && demo?.success === true && demo?.data?.accessToken;
  console.log(`  demo login (patient): ${demoOk ? '✓ working' : '✗ failed'}`);
  if (!demoOk) {
    const msg = String(demo?.message ?? demoRes.status).slice(0, 120);
    console.error(`\n❌ Demo login broken — recruiter "Try as Patient" will fail. (${msg})`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Health check failed:', err.message || err);
  process.exit(1);
});
