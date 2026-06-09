import { Router } from 'express';
import {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  getAppointmentPrescription,
} from '../controllers/prescriptionController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPrescriptionSchema,
  appointmentIdParamSchema,
  doctorIdParamSchema,
} from '../utils/schemas.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('doctor'), validate(createPrescriptionSchema), createPrescription);
router.get('/', authorize('patient', 'doctor', 'admin'), getPrescriptions);
router.get('/:id', authorize('patient', 'doctor', 'admin'), validate(doctorIdParamSchema), getPrescriptionById);
router.get(
  '/appointment/:appointmentId',
  authorize('patient', 'doctor', 'admin'),
  validate(appointmentIdParamSchema),
  getAppointmentPrescription
);

export default router;
