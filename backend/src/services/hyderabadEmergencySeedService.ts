import bcrypt from 'bcryptjs';
import { Hospital, AmbulanceUnit, User } from '../models/index.js';
import {
  HYDERABAD_AMBULANCE_STAGING,
  HYDERABAD_PARTNER_HOSPITALS,
} from '../data/hyderabadHospitalsSeed.js';

let seededThisProcess = false;

export async function ensureHyderabadEmergencyData() {
  if (seededThisProcess) return;
  seededThisProcess = true;

  for (const h of HYDERABAD_PARTNER_HOSPITALS) {
    await Hospital.findOneAndUpdate(
      { slug: h.slug },
      {
        name: h.name,
        slug: h.slug,
        city: 'Hyderabad',
        state: 'Telangana',
        address: h.address,
        phone: h.phone,
        type: h.type,
        specialties: h.specialties,
        emergencyAvailable: true,
        beds: h.beds,
        rating: h.rating,
        reviewCount: 120,
        isActive: true,
        coordinates: { lat: h.lat, lng: h.lng },
        location: { type: 'Point', coordinates: [h.lng, h.lat] },
      },
      { upsert: true, new: true }
    );
  }

  const hashedPassword = await bcrypt.hash('Password@123', 10);

  for (let i = 0; i < HYDERABAD_AMBULANCE_STAGING.length; i++) {
    const stage = HYDERABAD_AMBULANCE_STAGING[i];
    const email = `ambulance.hyd${i + 1}@lifecare.com`;

    const driver = await User.findOneAndUpdate(
      { email },
      {
        userType: 'ambulance',
        email,
        phone: `9876543${200 + i}`,
        password: hashedPassword,
        isEmailVerified: true,
        profile: { firstName: 'Hyderabad', lastName: `Driver ${i + 1}` },
        ambulanceDetails: {
          driverName: `Hyderabad Driver ${i + 1}`,
          licenseNumber: `TS-DL-${1000 + i}`,
          vehicleNumber: stage.vehicleNumber,
          vehicleType: 'BLS',
          availability: true,
          currentLocation: { lat: stage.lat, lng: stage.lng, timestamp: new Date() },
          location: { type: 'Point', coordinates: [stage.lng, stage.lat] },
          certifications: ['BLS Trained', 'First Aid Certified'],
          totalTrips: 400 + i * 50,
          policeVerified: true,
          rating: 4.6,
        },
      },
      { upsert: true, new: true }
    );

    if (driver) {
      await AmbulanceUnit.findOneAndUpdate(
        { vehicleNumber: stage.vehicleNumber },
        {
          driverId: driver._id,
          vehicleNumber: stage.vehicleNumber,
          isAvailable: true,
          status: 'idle',
          lastUpdated: new Date(),
          currentLocation: { type: 'Point', coordinates: [stage.lng, stage.lat] },
        },
        { upsert: true, new: true }
      );
    }
  }

  console.log(
    `[LifeCare+] Hyderabad emergency data ready — ${HYDERABAD_PARTNER_HOSPITALS.length} hospitals, ${HYDERABAD_AMBULANCE_STAGING.length} ambulances`
  );
}
