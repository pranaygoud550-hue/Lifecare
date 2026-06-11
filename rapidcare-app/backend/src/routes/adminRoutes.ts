import { Router } from 'express';
import {
  adminLogin,
  getDashboardAnalytics,
  createVehicle,
  createDriver,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/login', adminLogin);
router.get('/analytics/dashboard', authenticate, authorize('admin'), getDashboardAnalytics);
router.post('/vehicles', authenticate, authorize('admin'), createVehicle);
router.post('/drivers', authenticate, authorize('admin'), createDriver);

export default router;
