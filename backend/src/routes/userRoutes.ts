import { Router } from 'express';
import {
  getWallet,
  addMoney,
  createWalletTopUpIntent,
  confirmWalletTopUp,
  getTransactions,
  payWithWallet,
  requestRefund,
  getMedicalHistory,
  updateMedicalHistory,
} from '../controllers/walletController.js';
import { logVital, getVitals, deleteVital } from '../controllers/vitalsController.js';
import { getWellnessPlan } from '../controllers/wellnessController.js';
import { postDietLog, getDietLogs, getTodayDietLog } from '../controllers/dietLogController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  updateMedicalHistorySchema,
  logVitalSchema,
  walletTopUpSchema,
  walletConfirmTopUpSchema,
  walletAddMoneySchema,
  walletPaySchema,
  walletTransactionsQuerySchema,
  walletRefundParamSchema,
  vitalsQuerySchema,
  vitalIdParamSchema,
  dietLogSchema,
  dietLogsQuerySchema,
} from '../utils/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/wallet', authorize('patient'), getWallet);
router.post('/wallet/topup-intent', authorize('patient'), validate(walletTopUpSchema), createWalletTopUpIntent);
router.post('/wallet/confirm-topup', authorize('patient'), validate(walletConfirmTopUpSchema), confirmWalletTopUp);
router.post('/wallet/add-money', authorize('patient'), validate(walletAddMoneySchema), addMoney);
router.get('/wallet/transactions', authorize('patient'), validate(walletTransactionsQuerySchema), getTransactions);
router.post('/wallet/pay', authorize('patient'), validate(walletPaySchema), payWithWallet);
router.post(
  '/wallet/transactions/:transactionId/refund',
  authorize('patient'),
  validate(walletRefundParamSchema),
  requestRefund
);
router.get('/medical-history', authorize('patient'), getMedicalHistory);
router.put(
  '/medical-history',
  authorize('patient'),
  validate(updateMedicalHistorySchema),
  updateMedicalHistory
);

router.post('/vitals', authorize('patient'), validate(logVitalSchema), logVital);
router.get('/vitals', authorize('patient'), validate(vitalsQuerySchema), getVitals);
router.delete('/vitals/:id', authorize('patient'), validate(vitalIdParamSchema), deleteVital);

router.get('/wellness-plan', authorize('patient'), getWellnessPlan);

router.post('/diet-log', authorize('patient'), validate(dietLogSchema), postDietLog);
router.get('/diet-log/today', authorize('patient'), getTodayDietLog);
router.get('/diet-log', authorize('patient'), validate(dietLogsQuerySchema), getDietLogs);

export default router;
