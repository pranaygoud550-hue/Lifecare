import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { Driver } from '../models/Driver.js';
import { Vehicle } from '../models/Vehicle.js';

const HYDERABAD_DRIVERS = [
  { name: 'Ravi Kumar', phone: '9000000001', vehicleNumber: 'TS09EA1234', vehicleType: 'ALS' as const, lat: 17.4486, lng: 78.3908 },
  { name: 'Suresh Reddy', phone: '9000000002', vehicleNumber: 'TS09EB5678', vehicleType: 'BLS' as const, lat: 17.4375, lng: 78.4482 },
  { name: 'Anil Sharma', phone: '9000000003', vehicleNumber: 'TS09EC9012', vehicleType: 'PTV' as const, lat: 17.3616, lng: 78.4747 },
  { name: 'Mohammed Ali', phone: '9000000004', vehicleNumber: 'TS09ED3456', vehicleType: 'BLS' as const, lat: 17.4948, lng: 78.3996 },
];

async function seed() {
  await mongoose.connect(env.mongoUri);
  const passwordHash = await bcrypt.hash('driver123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  await Admin.deleteMany({});
  await Driver.deleteMany({});
  await Vehicle.deleteMany({});

  await Admin.create({ email: 'admin@rapidcare.app', passwordHash: adminHash, name: 'RapidCare Admin' });

  for (const d of HYDERABAD_DRIVERS) {
    const driver = await Driver.create({
      name: d.name,
      phone: d.phone,
      passwordHash,
      vehicleNumber: d.vehicleNumber,
      vehicleType: d.vehicleType,
      isAvailable: true,
      currentCoords: { lat: d.lat, lng: d.lng },
      rating: 4.7 + Math.random() * 0.3,
      totalTrips: Math.floor(Math.random() * 200),
    });
    await Vehicle.create({
      number: d.vehicleNumber,
      type: d.vehicleType,
      driverId: driver._id,
      isActive: true,
      lastServiceDate: new Date(),
    });
  }

  console.log('RapidCare seed complete');
  console.log('Admin: admin@rapidcare.app / admin123');
  console.log('Driver: 9000000001 / driver123');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
