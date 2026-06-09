import { Request, Response } from 'express';
import { User } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { upload, getFileUrl } from '../services/uploadService.js';
import { sendDoctorVerificationSubmittedEmail } from '../services/emailService.js';
import { approveDoctorById, rejectDoctorById } from '../services/doctorVerificationService.js';

export const doctorVerificationUpload = upload.fields([
  { name: 'medicalLicense', maxCount: 1 },
  { name: 'degreeCertificate', maxCount: 1 },
  { name: 'identityProof', maxCount: 1 },
]);

export const submitVerificationDocuments = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user || user.userType !== 'doctor') {
    res.status(403).json({ success: false, message: 'Only doctors can submit verification documents' });
    return;
  }

  const status = user.doctorDetails?.verificationStatus;
  if (status === 'approved') {
    res.status(400).json({ success: false, message: 'Your account is already verified' });
    return;
  }
  if (status === 'pending' && user.doctorDetails?.verificationDocuments?.submittedAt) {
    res.status(400).json({ success: false, message: 'Verification is already under review' });
    return;
  }

  const { medicalLicenseNumber } = req.body;
  if (!medicalLicenseNumber?.trim()) {
    res.status(400).json({ success: false, message: 'Medical license number is required' });
    return;
  }

  const files = req.files as Record<string, Express.Multer.File[]>;
  const licenseFile = files?.medicalLicense?.[0];
  const degreeFile = files?.degreeCertificate?.[0];
  const idFile = files?.identityProof?.[0];

  if (!licenseFile || !degreeFile || !idFile) {
    res.status(400).json({
      success: false,
      message: 'Please upload medical license, degree certificate, and identity proof',
    });
    return;
  }

  if (!user.doctorDetails) user.doctorDetails = {} as NonNullable<typeof user.doctorDetails>;
  user.doctorDetails.registrationNumber = medicalLicenseNumber.trim();
  user.doctorDetails.verificationDocuments = {
    medicalLicenseNumber: medicalLicenseNumber.trim(),
    medicalLicenseFile: getFileUrl(licenseFile.filename),
    degreeCertificateFile: getFileUrl(degreeFile.filename),
    identityProofFile: getFileUrl(idFile.filename),
    submittedAt: new Date(),
  };
  user.doctorDetails.verificationStatus = 'pending';
  user.doctorDetails.verified = false;
  user.doctorDetails.rejectionReason = undefined;

  await user.save();

  await sendDoctorVerificationSubmittedEmail({
    to: user.email,
    firstName: user.profile.firstName,
  });

  res.json({
    success: true,
    data: {
      verificationStatus: user.doctorDetails.verificationStatus,
      verificationDocuments: user.doctorDetails.verificationDocuments,
    },
  });
});

export const getMyVerificationStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId).select('-password');
  if (!user || user.userType !== 'doctor') {
    res.status(403).json({ success: false, message: 'Not a doctor account' });
    return;
  }

  res.json({
    success: true,
    data: {
      verificationStatus: user.doctorDetails?.verificationStatus || 'none',
      verified: user.doctorDetails?.verified || false,
      rejectionReason: user.doctorDetails?.rejectionReason,
      verificationDocuments: user.doctorDetails?.verificationDocuments,
    },
  });
});

export const approveDoctorVerification = asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = await approveDoctorById(String(req.params.id), req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode || 500).json({ success: false, message: e.message || 'Failed' });
  }
});

export const rejectDoctorVerification = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason?.trim()) {
    res.status(400).json({ success: false, message: 'Rejection reason is required' });
    return;
  }
  try {
    const user = await rejectDoctorById(String(req.params.id), reason);
    res.json({ success: true, data: user });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode || 500).json({ success: false, message: e.message || 'Failed' });
  }
});

export const getPendingDoctorVerifications = asyncHandler(async (_req: Request, res: Response) => {
  const doctors = await User.find({
    userType: 'doctor',
    $or: [
      { 'doctorDetails.verificationStatus': 'pending' },
      {
        'doctorDetails.verificationStatus': { $exists: false },
        'doctorDetails.verified': false,
        'doctorDetails.verificationDocuments.submittedAt': { $exists: true },
      },
    ],
  })
    .select('-password')
    .sort({ 'doctorDetails.verificationDocuments.submittedAt': -1, createdAt: -1 })
    .limit(50);

  res.json({ success: true, data: doctors });
});
