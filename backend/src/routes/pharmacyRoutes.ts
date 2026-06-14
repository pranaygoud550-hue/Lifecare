import { Router } from 'express';
import {
  getMedicines,
  getMedicineById,
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getStaffOrders,
  updateStaffOrderStatus,
  getStaffInventory,
} from '../controllers/pharmacyController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createOrderSchema,
  medicinesQuerySchema,
  doctorIdParamSchema,
  appointmentIdParamSchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/medicines', validate(medicinesQuerySchema), getMedicines);
router.get('/medicines/:id', validate(doctorIdParamSchema), getMedicineById);

router.use(authenticate);

router.post('/orders', authorize('patient'), validate(createOrderSchema), createOrder);
router.get('/orders', authorize('patient'), getOrders);
router.get('/orders/:id', authorize('patient'), validate(appointmentIdParamSchema), getOrderById);
router.put('/orders/:id/cancel', authorize('patient'), validate(appointmentIdParamSchema), cancelOrder);

router.get('/staff/orders', authorize('pharmacy'), getStaffOrders);
router.patch('/staff/orders/:id/status', authorize('pharmacy'), validate(appointmentIdParamSchema), updateStaffOrderStatus);
router.get('/staff/inventory', authorize('pharmacy'), getStaffInventory);

export default router;
