import { Router } from 'express';
import {
  uploadScan,
  getMyScanReports,
  getScanReportById,
  shareScanReport,
  reviewScanReport,
  getDoctorPendingScanReports,
  getDoctorScanList,
  getDoctorScanAnalyticsHandler,
} from '../controllers/scanController.js';
import {
  analyzeChestScan,
  getMyChestScans,
  getPatientChestScansForDoctor,
  getDoctorPatientScans,
  reviewChestScan,
} from '../controllers/chestScanController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireScanPatientOwner, requireScanViewer } from '../middleware/scanAccess.js';
import { scanUploadMiddleware } from '../middleware/uploadMiddleware.js';
import { analyzeUploadMiddleware } from '../middleware/analyzeUploadMiddleware.js';
import {
  scanUploadBodySchema,
  scanShareSchema,
  scanReviewSchema,
  doctorScansQuerySchema,
  chestScanNoteSchema,
} from '../utils/schemas.js';

const router = Router();

router.use(authenticate);

router.post(
  '/analyze',
  authorize('patient'),
  ...analyzeUploadMiddleware,
  analyzeChestScan
);

router.get('/my-scans', authorize('patient'), getMyChestScans);

router.get('/patient/:patientId', authorize('doctor'), getPatientChestScansForDoctor);

router.get('/doctor/patient-scans', authorize('doctor'), getDoctorPatientScans);

router.patch(
  '/chest/:id/note',
  authorize('doctor'),
  validate(chestScanNoteSchema),
  reviewChestScan
);

router.post(
  '/upload',
  authorize('patient'),
  ...scanUploadMiddleware,
  validate(scanUploadBodySchema),
  uploadScan
);

router.get('/my-reports', authorize('patient'), getMyScanReports);

router.get('/doctor/pending', authorize('doctor'), getDoctorPendingScanReports);

router.get(
  '/doctor/scans',
  authorize('doctor'),
  validate(doctorScansQuerySchema),
  getDoctorScanList
);

router.get('/doctor/analytics', authorize('doctor'), getDoctorScanAnalyticsHandler);

router.get('/:id', requireScanViewer, getScanReportById);

router.patch(
  '/:id/share',
  authorize('patient'),
  requireScanPatientOwner,
  validate(scanShareSchema),
  shareScanReport
);

router.patch(
  '/:id/review',
  authorize('doctor'),
  validate(scanReviewSchema),
  reviewScanReport
);

export default router;
