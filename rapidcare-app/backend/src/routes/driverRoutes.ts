import { Router } from 'express';
import { driverLogin, getDriverRequests, getDriverEarnings } from '../controllers/driverAuthController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/login', driverLogin);
router.get('/requests', authenticate, authorize('driver'), getDriverRequests);
router.get('/earnings', authenticate, authorize('driver'), getDriverEarnings);

export default router;
