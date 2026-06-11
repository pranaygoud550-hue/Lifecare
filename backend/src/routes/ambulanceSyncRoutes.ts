import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  syncRapidCareBooking,
  getPatientEmergencyHistory,
  getEmergencyRecordById,
} from '../controllers/ambulanceSyncController.js';

const router = Router();

router.post('/sync', syncRapidCareBooking);
router.get('/history', authenticate, authorize('patient'), getPatientEmergencyHistory);
router.get('/history/:id', authenticate, authorize('patient'), getEmergencyRecordById);

export default router;
