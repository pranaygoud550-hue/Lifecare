import { Router } from 'express';
import {
  createEmergencySos,
  getNearbyHospitals,
  updateAmbulanceLocation,
  getEmergencyEta,
  cancelEmergencyRequest,
  getDriverActiveRequest,
  patchDriverAvailability,
  verifyEmergencyOtp,
  markDriverArrivedRequest,
} from '../controllers/emergencyController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  emergencySosSchema,
  nearbyHospitalsQuerySchema,
  ambulanceLocationPatchSchema,
  emergencyRequestIdParamSchema,
  driverAvailabilitySchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/nearby-hospitals', validate(nearbyHospitalsQuerySchema), getNearbyHospitals);

router.get(
  '/requests/:id/eta',
  authenticate,
  validate(emergencyRequestIdParamSchema),
  getEmergencyEta
);

router.put(
  '/requests/:id/cancel',
  authenticate,
  authorize('patient', 'admin'),
  validate(emergencyRequestIdParamSchema),
  cancelEmergencyRequest
);

router.post(
  '/sos',
  authenticate,
  authorize('patient'),
  validate(emergencySosSchema, { statusCode: 422 }),
  createEmergencySos
);

router.patch(
  '/ambulance/location',
  authenticate,
  authorize('ambulance'),
  validate(ambulanceLocationPatchSchema),
  updateAmbulanceLocation
);

router.get(
  '/driver/active-request',
  authenticate,
  authorize('ambulance'),
  getDriverActiveRequest
);

router.patch(
  '/driver/status',
  authenticate,
  authorize('ambulance'),
  validate(driverAvailabilitySchema),
  patchDriverAvailability
);

router.post(
  '/requests/:id/verify-otp',
  authenticate,
  authorize('ambulance'),
  validate(emergencyRequestIdParamSchema),
  verifyEmergencyOtp
);

router.post(
  '/requests/:id/arrived',
  authenticate,
  authorize('ambulance'),
  validate(emergencyRequestIdParamSchema),
  markDriverArrivedRequest
);

export default router;
