import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  postBloodAlert,
  getHospitalAlerts,
  getHospitalAlertById,
  patchHospitalAlert,
} from '../controllers/bloodEmergencyController.js';
import { getMyHospitalProfile, postHospitalLegalAcknowledgment } from '../controllers/hospitalAdminController.js';
import {
  createBloodAlertSchema,
  bloodAlertIdParamSchema,
  updateBloodAlertStatusSchema,
  hospitalLegalAckSchema,
} from '../utils/schemas.js';

const router = Router();

router.use(authenticate, authorize('hospital_admin'));

router.get('/profile', getMyHospitalProfile);
router.post('/legal-acknowledgment', validate(hospitalLegalAckSchema), postHospitalLegalAcknowledgment);
router.post('/blood-alerts', validate(createBloodAlertSchema), postBloodAlert);
router.get('/blood-alerts', getHospitalAlerts);
router.get('/blood-alerts/:id', validate(bloodAlertIdParamSchema), getHospitalAlertById);
router.patch(
  '/blood-alerts/:id',
  validate(updateBloodAlertStatusSchema),
  patchHospitalAlert
);

export default router;
