import { Request, Response, NextFunction } from 'express';
import { ScanReport } from '../models/ScanReport.js';
import type { IScanReport } from '../models/ScanReport.js';

/**
 * Patients may only access their own scan reports (admins bypass).
 */
export const requireScanPatientOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user!.userType === 'admin') {
      next();
      return;
    }

    if (req.user!.userType !== 'patient') {
      res.status(403).json({
        success: false,
        message: 'Only patients can access this scan report as an owner.',
      });
      return;
    }

    const report = await ScanReport.findById(req.params.id).select('patientId');
    if (!report) {
      res.status(404).json({ success: false, message: 'Scan report not found' });
      return;
    }

    if (report.patientId.toString() !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'You can only view your own scan reports.' });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
};

/** Load report for GET /:id — patient owner OR doctor with access */
export const requireScanViewer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await ScanReport.findById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, message: 'Scan report not found' });
      return;
    }

    const userId = req.user!.userId;
    const role = req.user!.userType;

    if (role === 'admin') {
      (req as Request & { scanReport?: IScanReport }).scanReport = report;
      next();
      return;
    }

    if (role === 'patient' && report.patientId.toString() === userId) {
      (req as Request & { scanReport?: IScanReport }).scanReport = report;
      next();
      return;
    }

    if (role === 'doctor') {
      const isAssigned = report.doctorId?.toString() === userId;
      const isSharedWithMe =
        report.isSharedWithDoctor &&
        (!report.doctorId || report.doctorId.toString() === userId);
      if (isAssigned || isSharedWithMe) {
        (req as Request & { scanReport?: IScanReport }).scanReport = report;
        next();
        return;
      }
    }

    res.status(403).json({ success: false, message: 'Access denied to this scan report.' });
  } catch (err) {
    next(err);
  }
};
