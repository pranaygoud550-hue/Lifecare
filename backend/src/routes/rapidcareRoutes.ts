import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  syncRapidCare,
  getRapidCareHistory,
  shareRapidCareWithDoctor,
} from '../controllers/rapidcareController.js';

const router = Router();

router.post('/sync', syncRapidCare);
router.get('/history/:patientId', authenticate, authorize('patient', 'admin'), getRapidCareHistory);
router.patch('/:bookingId/share', authenticate, authorize('patient'), shareRapidCareWithDoctor);

export default router;
