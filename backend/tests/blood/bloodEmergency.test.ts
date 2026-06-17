import bcrypt from 'bcryptjs';
import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';
import { User, Hospital, Notification, BloodEmergencyAlert } from '../../src/models/index.js';
import { issueTokenPair } from '../../src/services/tokenService.js';

let phoneSeq = 0;

async function createHospitalAdmin(hospitalId: string) {
  const hashed = await bcrypt.hash('Password@123', 10);
  const admin = await User.create({
    userType: 'hospital_admin',
    email: `hospital-admin-${Date.now()}@test.com`,
    phone: `9${String(Date.now()).slice(-9)}`,
    password: hashed,
    isEmailVerified: true,
    profile: { firstName: 'Hospital', lastName: 'Admin' },
    hospitalAdminDetails: {
      hospitalId,
      designation: 'Coordinator',
      verified: true,
      bloodBankLicenseNumber: 'TEST-LICENSE-001',
    },
  });
  const { accessToken } = await issueTokenPair({
    userId: admin._id.toString(),
    userType: 'hospital_admin',
    email: admin.email,
  });
  return { admin, token: accessToken };
}

async function acknowledgeLegalForAdmin(app: Awaited<ReturnType<typeof getTestApp>>, token: string) {
  await request(app)
    .post('/api/hospital/legal-acknowledgment')
    .set('Authorization', `Bearer ${token}`)
    .send({
      acknowledgedBy: 'Test Coordinator',
      bloodBankLicenseNumber: 'TEST-LICENSE-001',
      acceptTerms: true,
      confirmAuthorized: true,
      confirmGenuineNeed: true,
      confirmDonorScreening: true,
      confirmDataProtection: true,
    });
}

async function createHyderabadPatient(bloodGroup: string, suffix: string) {
  phoneSeq += 1;
  const hashed = await bcrypt.hash('Password@123', 10);
  const patient = await User.create({
    userType: 'patient',
    email: `patient-${suffix}-${Date.now()}-${phoneSeq}@test.com`,
    phone: `98765${String(phoneSeq).padStart(5, '0')}`,
    password: hashed,
    isEmailVerified: true,
    profile: {
      firstName: 'Test',
      lastName: suffix,
      address: { city: 'Hyderabad', state: 'Telangana' },
    },
    medicalHistory: { bloodGroup, profileCompleted: true },
  });
  const { accessToken } = await issueTokenPair({
    userId: patient._id.toString(),
    userType: 'patient',
    email: patient.email,
  });
  return { patient, token: accessToken };
}

describe('blood emergency alerts', () => {
  let hospitalId: string;

  beforeEach(async () => {
    const hospital = await Hospital.create({
      name: `Test Blood Hospital ${Date.now()}`,
      slug: `test-blood-${Date.now()}`,
      city: 'Hyderabad',
      state: 'Telangana',
      address: 'Test Road, Hyderabad',
      coordinates: { lat: 17.385, lng: 78.4867 },
      location: { type: 'Point', coordinates: [78.4867, 17.385] },
      type: 'multi-specialty',
      specialties: ['Emergency'],
      emergencyAvailable: true,
      isActive: true,
    });
    hospitalId = hospital._id.toString();
  });

  it('notifies only matching Hyderabad blood group patients', async () => {
    const app = await getTestApp();
    const { token: adminToken } = await createHospitalAdmin(hospitalId);
    await acknowledgeLegalForAdmin(app, adminToken);
    const { patient: oPlus } = await createHyderabadPatient('O+', 'oplus');
    const { patient: aMinus } = await createHyderabadPatient('A-', 'aminus');

    const res = await request(app)
      .post('/api/hospital/blood-alerts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bloodGroup: 'O+', urgency: 'urgent', notes: 'Accident victim needs blood' });

    expect(res.status).toBe(201);
    expect(res.body.data.notifiedCount).toBe(1);

    const oPlusNotifs = await Notification.countDocuments({ userId: oPlus._id, type: 'blood_emergency' });
    const aMinusNotifs = await Notification.countDocuments({ userId: aMinus._id, type: 'blood_emergency' });
    expect(oPlusNotifs).toBe(1);
    expect(aMinusNotifs).toBe(0);
  });

  it('allows patient to respond on_my_way', async () => {
    const app = await getTestApp();
    const { admin, token: adminToken } = await createHospitalAdmin(hospitalId);
    await acknowledgeLegalForAdmin(app, adminToken);
    const { patient, token: patientToken } = await createHyderabadPatient('B+', 'bplus');

    const createRes = await request(app)
      .post('/api/hospital/blood-alerts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bloodGroup: 'B+', urgency: 'critical' });

    const alertId = createRes.body.data._id;

    const respondRes = await request(app)
      .post(`/api/users/blood-alerts/${alertId}/respond`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ status: 'on_my_way' });

    expect(respondRes.status).toBe(200);

    const alert = await BloodEmergencyAlert.findById(alertId);
    expect(alert?.responses.some((r) => r.userId.toString() === patient._id.toString())).toBe(true);

    const staffNotif = await Notification.findOne({
      userId: admin._id,
      type: 'blood_emergency',
      title: 'Donor response update',
    });
    expect(staffNotif).toBeTruthy();
  });

  it('blocks duplicate active alert for same hospital and blood group', async () => {
    const app = await getTestApp();
    const { token: adminToken } = await createHospitalAdmin(hospitalId);
    await acknowledgeLegalForAdmin(app, adminToken);
    await createHyderabadPatient('O+', 'dup');

    const first = await request(app)
      .post('/api/hospital/blood-alerts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bloodGroup: 'O+', urgency: 'urgent' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/hospital/blood-alerts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bloodGroup: 'O+', urgency: 'urgent' });
    expect(second.status).toBe(400);
  });

  it('lists active alerts for patients', async () => {
    const app = await getTestApp();
    const { token: adminToken } = await createHospitalAdmin(hospitalId);
    await acknowledgeLegalForAdmin(app, adminToken);
    const { token: patientToken } = await createHyderabadPatient('AB+', 'ab');

    await request(app)
      .post('/api/hospital/blood-alerts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bloodGroup: 'AB+', urgency: 'normal' });

    const listRes = await request(app)
      .get('/api/users/blood-alerts/active')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data[0].bloodGroup).toBe('AB+');
  });
});
