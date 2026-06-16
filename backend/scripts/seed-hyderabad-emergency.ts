import connectDB from '../src/config/database.js';
import { ensureHyderabadEmergencyData } from '../src/services/hyderabadEmergencySeedService.js';

connectDB()
  .then(async () => {
    await ensureHyderabadEmergencyData();
    console.log('Hyderabad emergency hospitals + ambulances seeded.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
