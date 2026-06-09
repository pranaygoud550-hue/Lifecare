import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { notificationsQuerySchema, doctorIdParamSchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(notificationsQuerySchema), getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', validate(doctorIdParamSchema), markAsRead);

export default router;
