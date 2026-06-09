import { Router } from 'express';
import {
  getDashboardStats,
  getAllUsers,
  verifyUser,
  blockUser,
  getSpecialties,
  getPlatformStats,
  getRevenueReport,
  getAllAppointments,
  getPendingReviews,
  moderateReview,
  getPlatformHealth,
} from '../controllers/adminController.js';
import {
  getPendingDoctorVerifications,
  approveDoctorVerification,
  rejectDoctorVerification,
} from '../controllers/doctorVerificationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminUsersQuerySchema,
  adminBlockUserSchema,
  doctorIdParamSchema,
  adminRejectDoctorSchema,
  adminModerateReviewSchema,
} from '../utils/schemas.js';

const router = Router();

router.get('/specialties', getSpecialties);
router.get('/stats', getPlatformStats);

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/health', getPlatformHealth);
router.get('/users', validate(adminUsersQuerySchema), getAllUsers);
router.get('/doctors/pending-verification', getPendingDoctorVerifications);
router.put('/doctors/:id/approve', validate(doctorIdParamSchema), approveDoctorVerification);
router.put('/doctors/:id/reject', validate(adminRejectDoctorSchema), rejectDoctorVerification);
router.get('/appointments', getAllAppointments);
router.get('/reports/revenue', getRevenueReport);
router.get('/reviews/pending', getPendingReviews);
router.put('/reviews/:id/moderate', validate(adminModerateReviewSchema), moderateReview);
router.put('/users/:id/verify', validate(doctorIdParamSchema), verifyUser);
router.put('/users/:id/block', validate(adminBlockUserSchema), blockUser);

export default router;
