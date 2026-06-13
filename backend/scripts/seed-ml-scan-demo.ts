/**
 * Seeds demo ML scan records for the dev demo patient (9876543210).
 * Run: npm run seed:ml-demo -w backend
 */
import connectDB, { disconnectDB } from '../src/config/database.js';
import { User } from '../src/models/index.js';
import { analyzeAndStoreScan } from '../src/services/chestScanService.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, '../tests/fixtures/sample-chest.png');

async function main() {
  await connectDB();
  const patient = await User.findOne({ phone: '9876543210', userType: 'patient' });
  if (!patient) {
    console.error('Demo patient (9876543210) not found. Run npm run seed -w backend first.');
    process.exit(1);
  }

  const buffer = readFileSync(fixture);
  const scan = await analyzeAndStoreScan({
    patientId: patient._id.toString(),
    buffer,
    mimetype: 'image/png',
    originalname: 'demo-chest-test.png',
  });

  console.log('Demo chest scan created:', scan._id, scan.prediction, `${scan.confidence}%`);
  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
