import { Router } from 'express';
import {
  requestTransport,
  requestEmergencySos,
  getTransportById,
  trackByToken,
  trackById,
  acceptTransport,
  updateTransportStatus,
  updateTransportLocation,
  verifyPickupOtp,
  triggerPanic,
  cancelTransport,
  getDriverRequests,
  regenerateTrackingLink,
} from '../controllers/transportController.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  transportRequestSchema,
  appointmentIdParamSchema,
  transportStatusSchema,
  transportOtpSchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/track/:token', trackByToken);

router.post('/sos', optionalAuth, requestEmergencySos);
router.post('/request', optionalAuth, validate(transportRequestSchema), requestTransport);

router.use(authenticate);

router.get('/driver/requests', authorize('ambulance'), getDriverRequests);
router.put('/:id/accept', authorize('ambulance'), validate(appointmentIdParamSchema), acceptTransport);
router.put('/:id/status', authorize('ambulance'), validate(transportStatusSchema), updateTransportStatus);
router.post('/:id/location', authorize('ambulance'), validate(appointmentIdParamSchema), updateTransportLocation);
router.post('/:id/verify-otp', authorize('ambulance'), validate(transportOtpSchema), verifyPickupOtp);
router.post('/:id/panic', authorize('patient'), validate(appointmentIdParamSchema), triggerPanic);
router.post(
  '/:id/tracking-link',
  authorize('patient', 'ambulance'),
  validate(appointmentIdParamSchema),
  regenerateTrackingLink
);
router.put('/:id/cancel', authorize('patient', 'ambulance'), validate(appointmentIdParamSchema), cancelTransport);
router.get('/:id/track', authorize('patient', 'ambulance', 'admin'), validate(appointmentIdParamSchema), trackById);
router.get('/:id', authorize('patient', 'ambulance', 'admin'), validate(appointmentIdParamSchema), getTransportById);

export default router;
