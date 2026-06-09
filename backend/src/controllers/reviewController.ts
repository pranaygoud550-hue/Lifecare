import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review, User, Appointment } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';

export const updateDoctorRating = async (doctorId: string) => {
  const reviews = await Review.find({
    reviewType: 'doctor',
    reviewFor: doctorId,
    status: 'approved',
  });

  const doctor = await User.findById(doctorId);
  if (!doctor?.doctorDetails) return;

  if (reviews.length === 0) {
    doctor.doctorDetails.rating = 0;
    doctor.doctorDetails.reviewCount = 0;
  } else {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    doctor.doctorDetails.rating = Math.round(avg * 10) / 10;
    doctor.doctorDetails.reviewCount = reviews.length;
  }
  await doctor.save();
};

export const submitReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewType, reviewFor, relatedTo, rating, review } = req.body;

  const existing = relatedTo
    ? await Review.findOne({ reviewedBy: req.user!.userId, relatedTo })
    : null;

  if (existing) {
    res.status(409).json({ success: false, message: 'You have already reviewed this' });
    return;
  }

  const isFlagged = rating <= 2 || (typeof review === 'string' && /scam|fraud|fake|terrible|worst/i.test(review));

  const newReview = await Review.create({
    reviewType,
    reviewFor,
    reviewedBy: req.user!.userId,
    relatedTo,
    rating,
    review,
    isVerified: !!relatedTo,
    status: isFlagged ? 'pending' : 'approved',
  });

  if (reviewType === 'doctor' && !isFlagged) {
    await updateDoctorRating(reviewFor);
  }

  const populated = await Review.findById(newReview._id).populate(
    'reviewedBy',
    'profile.firstName profile.lastName profile.profilePhoto'
  );

  res.status(201).json({ success: true, data: populated });
});

export const getDoctorReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const [reviews, total] = await Promise.all([
    Review.find({ reviewType: 'doctor', reviewFor: req.params.id, status: 'approved' })
      .populate('reviewedBy', 'profile.firstName profile.lastName profile.profilePhoto')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Review.countDocuments({ reviewType: 'doctor', reviewFor: req.params.id, status: 'approved' }),
  ]);

  res.json({
    success: true,
    data: { reviews, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
});

export const rateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { score, review } = req.body;
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.patientId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only patient can rate' });
    return;
  }

  if (appointment.status !== 'completed') {
    res.status(400).json({ success: false, message: 'Can only rate completed appointments' });
    return;
  }

  appointment.rating = { score, review, timestamp: new Date() };
  await appointment.save();

  const existingReview = await Review.findOne({
    reviewedBy: req.user!.userId,
    relatedTo: appointment._id,
  });

  if (!existingReview) {
    await Review.create({
      reviewType: 'doctor',
      reviewFor: appointment.doctorId,
      reviewedBy: req.user!.userId,
      relatedTo: appointment._id,
      rating: score,
      review,
      isVerified: true,
      status: 'approved',
    });
    await updateDoctorRating(appointment.doctorId.toString());
  }

  res.json({ success: true, data: appointment });
});

export const markReviewHelpful = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpful: 1 } },
    { new: true }
  );
  if (!review) {
    res.status(404).json({ success: false, message: 'Review not found' });
    return;
  }
  res.json({ success: true, data: review });
});

export const respondToReview = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404).json({ success: false, message: 'Review not found' });
    return;
  }

  if (review.reviewFor.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  review.response = {
    by: new mongoose.Types.ObjectId(req.user!.userId),
    message,
    timestamp: new Date(),
  };
  await review.save();

  res.json({ success: true, data: review });
});
