import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import {
  addDoctorNote,
  analyzeAndStoreScan,
  getDoctorSharedScans,
  getPatientScans,
  getSharedScansForPatient,
  shareScanWithDoctor,
} from '../services/chestScanService.js';
import { syncScanToHealthVault } from '../services/scanHistoryService.js';

export const analyzeChestScan = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file?.buffer) {
    res.status(400).json({ success: false, message: 'Image file is required (field: image)' });
    return;
  }

  try {
    const result = await analyzeAndStoreScan({
      patientId: req.user!.userId,
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      imageUrl: file.cloudinaryUrl,
      cloudinaryPublicId: file.cloudinaryPublicId,
    });

    const scanId = String((result as { _id?: string })._id ?? '');
    if (scanId && result.prediction) {
      await syncScanToHealthVault({
        patientId: req.user!.userId,
        scanId,
        scanType: 'chest_xray',
        prediction: result.prediction,
        confidence: result.confidence,
        imageUrl: result.imageUrl,
        explanation: result.explanation,
        createdAt: new Date((result as { createdAt?: string }).createdAt ?? Date.now()),
      }).catch(() => undefined);
    }

    res.status(201).json({
      success: true,
      message: 'Chest X-ray analyzed successfully',
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    if (/MediScan API error/.test(message)) {
      res.status(502).json({ success: false, message });
      return;
    }
    throw err;
  }
});

export const getMyChestScans = asyncHandler(async (req: Request, res: Response) => {
  const scans = await getPatientScans(req.user!.userId);
  res.json({ success: true, data: scans });
});

export const shareChestScan = asyncHandler(async (req: Request, res: Response) => {
  const scan = await shareScanWithDoctor(
    String(req.params.id),
    req.user!.userId,
    req.body.doctorId
  );

  if (!scan) {
    res.status(404).json({ success: false, message: 'Scan not found' });
    return;
  }

  res.json({
    success: true,
    message: 'Scan shared with your doctor',
    data: scan,
  });
});

export const getPatientChestScansForDoctor = asyncHandler(
  async (req: Request, res: Response) => {
    const scans = await getSharedScansForPatient(
      String(req.params.patientId),
      req.user!.userId
    );
    res.json({ success: true, data: scans });
  }
);

export const getDoctorPatientScans = asyncHandler(async (req: Request, res: Response) => {
  const scans = await getDoctorSharedScans(req.user!.userId);
  res.json({ success: true, data: scans });
});

export const reviewChestScan = asyncHandler(async (req: Request, res: Response) => {
  const { doctorNote } = req.body;
  if (!doctorNote?.trim()) {
    res.status(400).json({ success: false, message: 'doctorNote is required' });
    return;
  }

  const scan = await addDoctorNote(
    String(req.params.id),
    req.user!.userId,
    doctorNote.trim()
  );

  if (!scan) {
    res.status(404).json({
      success: false,
      message: 'Scan not found or not shared with you',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Doctor note saved',
    data: scan,
  });
});
