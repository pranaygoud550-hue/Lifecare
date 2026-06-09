import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import { buildWellnessPlanForPatient } from '../services/wellnessAdvisorService.js';

export const getWellnessPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await buildWellnessPlanForPatient(req.user!.userId);
  res.json({ success: true, data: plan });
});
