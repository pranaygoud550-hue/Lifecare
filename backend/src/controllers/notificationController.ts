import { Request, Response } from 'express';
import { Notification } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { type, limit = '50' } = req.query;
  const filter: Record<string, unknown> = { userId: req.user!.userId };
  if (type && typeof type === 'string' && type !== 'all') {
    if (type === 'appointment') {
      filter.type = {
        $in: [
          'appointment',
          'appointment_booked',
          'appointment_reminder',
          'appointment_accepted',
          'appointment_rejected',
        ],
      };
    } else {
      filter.type = type;
    }
  }

  const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ sentAt: -1 }).limit(limitNum),
    Notification.countDocuments({ userId: req.user!.userId, isRead: false }),
  ]);

  res.json({
    success: true,
    data: notifications,
    meta: { unreadCount },
  });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!updated) {
    res.status(404).json({ success: false, message: 'Notification not found' });
    return;
  }

  res.json({ success: true, data: updated });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany(
    { userId: req.user!.userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true, message: 'All notifications marked as read' });
});
