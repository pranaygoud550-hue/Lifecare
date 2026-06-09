import { Router } from 'express';
import {
  bookAppointment,
  uploadBookingReports,
  confirmAppointmentPayment,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
  joinConsultation,
  completeAppointment,
  acceptAppointment,
  rejectAppointment,
} from '../controllers/appointmentController.js';
import { rateAppointment } from '../controllers/reviewController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  bookAppointmentSchema,
  confirmAppointmentPaymentSchema,
  appointmentIdParamSchema,
  cancelAppointmentSchema,
  rejectAppointmentSchema,
  appointmentsQuerySchema,
  rateAppointmentSchema,
} from '../utils/schemas.js';
import { upload } from '../services/uploadService.js';
import { createAppointmentPaymentIntent } from '../controllers/paymentController.js';

const router = Router();

router.use(authenticate);

router.post('/book', authorize('patient'), validate(bookAppointmentSchema), bookAppointment);
router.post(
  '/upload-reports',
  authorize('patient'),
  upload.array('reports', 5),
  uploadBookingReports
);
router.post(
  '/:id/payment-intent',
  authorize('patient'),
  validate(appointmentIdParamSchema),
  createAppointmentPaymentIntent
);
router.post(
  '/:id/pay',
  authorize('patient'),
  validate(confirmAppointmentPaymentSchema),
  confirmAppointmentPayment
);
router.get('/', validate(appointmentsQuerySchema), getAppointments);
router.get('/:id', validate(appointmentIdParamSchema), getAppointmentById);
router.put('/:id/accept', authorize('doctor'), validate(appointmentIdParamSchema), acceptAppointment);
router.put(
  '/:id/reject',
  authorize('doctor'),
  validate(rejectAppointmentSchema),
  rejectAppointment
);
router.put(
  '/:id/cancel',
  authorize('patient', 'admin'),
  validate(cancelAppointmentSchema),
  cancelAppointment
);
router.post(
  '/:id/join',
  authorize('patient', 'doctor'),
  validate(appointmentIdParamSchema),
  joinConsultation
);
router.post(
  '/:id/complete',
  authorize('doctor'),
  validate(appointmentIdParamSchema),
  completeAppointment
);
router.post(
  '/:id/rate',
  authorize('patient'),
  validate(rateAppointmentSchema),
  rateAppointment
);

export default router;
