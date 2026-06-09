import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  getDoctorAvailability,
  getFeaturedDoctors,
  getDoctorDashboard,
} from '../controllers/doctorController.js';
import {
  submitVerificationDocuments,
  getMyVerificationStatus,
  doctorVerificationUpload,
} from '../controllers/doctorVerificationController.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  doctorsQuerySchema,
  doctorIdParamSchema,
  doctorAvailabilityQuerySchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/', optionalAuth, validate(doctorsQuerySchema), getDoctors);
router.get('/featured', getFeaturedDoctors);
router.get('/dashboard', authenticate, authorize('doctor'), getDoctorDashboard);
router.get('/verification/status', authenticate, authorize('doctor'), getMyVerificationStatus);
router.post(
  '/verification/documents',
  authenticate,
  authorize('doctor'),
  doctorVerificationUpload,
  submitVerificationDocuments
);
router.get('/:id', validate(doctorIdParamSchema), getDoctorById);
router.get('/:id/availability', validate(doctorAvailabilityQuerySchema), getDoctorAvailability);

export default router;
