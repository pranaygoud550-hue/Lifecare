import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getMyPatients,
  getMyPatientDetail,
  publishCarePlan,
  getPatientCarePlansForDoctor,
} from '../controllers/doctorPortalController.js';

const router = Router();

router.use(authenticate, authorize('doctor'));

router.get('/patients', getMyPatients);
router.get('/patients/:patientId', getMyPatientDetail);
router.get('/patients/:patientId/care-plans', getPatientCarePlansForDoctor);
router.post('/patients/:patientId/care-plans', publishCarePlan);

export default router;
