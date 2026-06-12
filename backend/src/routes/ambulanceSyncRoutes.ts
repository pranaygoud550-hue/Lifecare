import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getPatientEmergencyHistory, getEmergencyRecordById } from '../controllers/ambulanceSyncController.js';

const router = Router();

router.get('/history', authenticate, authorize('patient'), getPatientEmergencyHistory);
router.get('/history/:id', authenticate, authorize('patient'), getEmergencyRecordById);

export default router;
