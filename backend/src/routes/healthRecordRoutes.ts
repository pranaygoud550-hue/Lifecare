import { Router } from 'express';
import {
  getHealthRecords,
  getHealthRecordById,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  shareHealthRecord,
} from '../controllers/healthRecordController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  healthRecordsQuerySchema,
  appointmentIdParamSchema,
  shareHealthRecordSchema,
} from '../utils/schemas.js';
import { upload } from '../services/uploadService.js';

const router = Router();

router.use(authenticate, authorize('patient'));

router.get('/', validate(healthRecordsQuerySchema), getHealthRecords);
router.get('/:id', validate(appointmentIdParamSchema), getHealthRecordById);
router.post('/', upload.array('files', 5), createHealthRecord);
router.put('/:id', validate(appointmentIdParamSchema), updateHealthRecord);
router.delete('/:id', validate(appointmentIdParamSchema), deleteHealthRecord);
router.post('/:id/share', validate(shareHealthRecordSchema), shareHealthRecord);

export default router;
