import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getMyReminders,
  createRemindersFromPrescription,
  patchReminder,
  deleteReminder,
} from '../controllers/reminderController.js';

const router = Router();

router.use(authenticate, authorize('patient'));

router.get('/', getMyReminders);
router.post('/from-prescription/:prescriptionId', createRemindersFromPrescription);
router.patch('/:id', patchReminder);
router.delete('/:id', deleteReminder);

export default router;
