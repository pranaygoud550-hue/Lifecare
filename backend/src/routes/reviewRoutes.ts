import { Router } from 'express';
import {
  submitReview,
  getDoctorReviews,
  rateAppointment,
  markReviewHelpful,
  respondToReview,
} from '../controllers/reviewController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  reviewSchema,
  doctorIdParamSchema,
  rateAppointmentSchema,
  reviewRespondSchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/doctor/:id', validate(doctorIdParamSchema), getDoctorReviews);
router.post('/:id/helpful', validate(doctorIdParamSchema), markReviewHelpful);

router.use(authenticate);

router.post('/', authorize('patient'), validate(reviewSchema), submitReview);
router.post(
  '/appointment/:id/rate',
  authorize('patient'),
  validate(rateAppointmentSchema),
  rateAppointment
);
router.post(
  '/:id/respond',
  authorize('doctor', 'pharmacy'),
  validate(reviewRespondSchema),
  respondToReview
);

export default router;
