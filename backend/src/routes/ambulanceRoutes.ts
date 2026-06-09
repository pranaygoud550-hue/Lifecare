import { Router } from 'express';
import {
  requestAmbulance,
  getAmbulanceRequests,
  getAmbulanceRequestById,
  trackAmbulance,
  acceptAmbulanceRequest,
  updateAmbulanceStatus,
  updateDriverLocation,
  cancelAmbulanceRequest,
} from '../controllers/ambulanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  ambulanceRequestSchema,
  appointmentIdParamSchema,
  ambulanceStatusSchema,
  driverLocationSchema,
} from '../utils/schemas.js';

const router = Router();

router.use(authenticate);

router.post('/request', authorize('patient'), validate(ambulanceRequestSchema), requestAmbulance);
router.get('/requests', authorize('patient', 'ambulance', 'admin'), getAmbulanceRequests);
router.get(
  '/requests/:id',
  authorize('patient', 'ambulance', 'admin'),
  validate(appointmentIdParamSchema),
  getAmbulanceRequestById
);
router.get(
  '/requests/:id/track',
  authorize('patient', 'ambulance', 'admin'),
  validate(appointmentIdParamSchema),
  trackAmbulance
);
router.put(
  '/requests/:id/cancel',
  authorize('patient'),
  validate(appointmentIdParamSchema),
  cancelAmbulanceRequest
);
router.get('/driver-requests', authorize('ambulance'), getAmbulanceRequests);
router.put(
  '/driver-requests/:id/accept',
  authorize('ambulance'),
  validate(appointmentIdParamSchema),
  acceptAmbulanceRequest
);
router.put(
  '/driver-requests/:id/status',
  authorize('ambulance'),
  validate(ambulanceStatusSchema),
  updateAmbulanceStatus
);
router.post('/driver-requests/:id/location', authorize('ambulance'), validate(driverLocationSchema), updateDriverLocation);

export default router;
