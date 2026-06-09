import { Router } from 'express';
import {
  createPaymentIntent,
  verifyPayment,
  applyCoupon,
  getPaymentConfig,
} from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPaymentIntentSchema,
  verifyPaymentSchema,
  applyCouponSchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/config', authenticate, getPaymentConfig);

router.use(authenticate, authorize('patient', 'admin'));

router.post('/create-intent', validate(createPaymentIntentSchema), createPaymentIntent);
router.post('/verify', validate(verifyPaymentSchema), verifyPayment);
router.post('/apply-coupon', validate(applyCouponSchema), applyCoupon);

export default router;
