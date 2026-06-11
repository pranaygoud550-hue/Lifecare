import { Router } from 'express';
import {
  createBooking,
  getBooking,
  getLiveBookings,
  updateBookingStatus,
  acceptBooking,
  verifyOtp,
  cancelBooking,
  updateDriverLocation,
  getAvailableDrivers,
  getPublicStats,
} from '../controllers/bookingController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/stats', getPublicStats);
router.post('/create', createBooking);
router.get('/live', getLiveBookings);
router.get('/drivers/available', getAvailableDrivers);
router.get('/:id', getBooking);
router.patch('/:id/status', authenticate, authorize('driver', 'admin'), updateBookingStatus);
router.post('/:id/accept', authenticate, authorize('driver'), acceptBooking);
router.post('/:id/verify-otp', authenticate, authorize('driver'), verifyOtp);
router.post('/:id/cancel', cancelBooking);
router.post('/drivers/location', authenticate, authorize('driver'), updateDriverLocation);

export default router;
