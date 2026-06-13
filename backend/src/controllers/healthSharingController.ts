import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import { User, DoctorCarePlan } from '../models/index.js';

export const getMyHealthSharing = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId).select('healthDataSharing');
  res.json({
    success: true,
    data: user?.healthDataSharing ?? {
      shareVitalsWithDoctors: false,
      shareWellnessWithDoctors: false,
    },
  });
});

export const updateMyHealthSharing = asyncHandler(async (req: Request, res: Response) => {
  const { shareVitalsWithDoctors, shareWellnessWithDoctors } = req.body as {
    shareVitalsWithDoctors?: boolean;
    shareWellnessWithDoctors?: boolean;
  };

  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  user.healthDataSharing = {
    shareVitalsWithDoctors:
      shareVitalsWithDoctors ?? user.healthDataSharing?.shareVitalsWithDoctors ?? false,
    shareWellnessWithDoctors:
      shareWellnessWithDoctors ?? user.healthDataSharing?.shareWellnessWithDoctors ?? false,
    updatedAt: new Date(),
  };
  await user.save();

  res.json({ success: true, data: user.healthDataSharing });
});

export const getMyPublishedCarePlans = asyncHandler(async (req: Request, res: Response) => {
  const plans = await DoctorCarePlan.find({
    patientId: req.user!.userId,
    publishedToPatient: true,
  })
    .sort({ createdAt: -1 })
    .populate('doctorId', 'profile');

  res.json({ success: true, data: plans });
});
