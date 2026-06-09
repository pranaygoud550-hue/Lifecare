import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { sendDoctorApprovedEmail, sendDoctorRejectedEmail } from './emailService.js';

export async function approveDoctorById(doctorId: string, adminId: string) {
  const user = await User.findById(doctorId);
  if (!user || user.userType !== 'doctor') {
    throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });
  }

  if (!user.doctorDetails) user.doctorDetails = {} as NonNullable<typeof user.doctorDetails>;
  user.doctorDetails.verified = true;
  user.doctorDetails.verificationStatus = 'approved';
  user.doctorDetails.verifiedAt = new Date();
  user.doctorDetails.verifiedBy = new mongoose.Types.ObjectId(adminId);
  user.doctorDetails.rejectionReason = undefined;

  await user.save();

  await sendDoctorApprovedEmail({
    to: user.email,
    firstName: user.profile.firstName,
  });

  return user;
}

export async function rejectDoctorById(doctorId: string, reason: string) {
  const user = await User.findById(doctorId);
  if (!user || user.userType !== 'doctor') {
    throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });
  }

  if (!user.doctorDetails) user.doctorDetails = {} as NonNullable<typeof user.doctorDetails>;
  user.doctorDetails.verified = false;
  user.doctorDetails.verificationStatus = 'rejected';
  user.doctorDetails.rejectionReason = reason.trim();

  await user.save();

  await sendDoctorRejectedEmail({
    to: user.email,
    firstName: user.profile.firstName,
    reason: reason.trim(),
  });

  return user;
}
