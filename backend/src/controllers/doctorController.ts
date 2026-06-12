import { Request, Response } from 'express';
import { User, Appointment, Review } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { sanitizeUser } from '../services/authService.js';
import { TIME_SLOTS } from '../utils/helpers.js';
import { getNextAvailableSlot, isAvailableToday } from '../services/doctorAvailabilityService.js';

export const getDoctors = asyncHandler(async (req: Request, res: Response) => {
  const {
    specialty,
    search,
    minRating,
    maxFee,
    minFee,
    consultationType,
    language,
    gender,
    minExperience,
    city,
    mode,
    availableToday,
    page = '1',
    limit = '12',
    sort = 'relevance',
  } = req.query;

  const filter: Record<string, unknown> = {
    userType: 'doctor',
    isActive: true,
    isBlocked: false,
    'doctorDetails.verified': true,
  };

  if (specialty) filter['doctorDetails.specializations'] = specialty;
  if (minRating) filter['doctorDetails.rating'] = { $gte: Number(minRating) };
  if (language) filter['doctorDetails.languages'] = language;
  if (gender) filter['profile.gender'] = { $regex: new RegExp(`^${gender}$`, 'i') };
  if (minExperience) filter['doctorDetails.experience'] = { $gte: Number(minExperience) };
  if (city) filter['profile.address.city'] = { $regex: city, $options: 'i' };

  if (consultationType) {
    filter['doctorDetails.consultationTypes'] = consultationType;
  } else if (mode === 'online') {
    filter['doctorDetails.consultationTypes'] = { $in: ['video', 'audio', 'chat'] };
  } else if (mode === 'in-clinic') {
    filter['doctorDetails.consultationTypes'] = { $in: ['homeVisit'] };
  }

  const feeField =
    mode === 'in-clinic'
      ? 'doctorDetails.consultationFees.homeVisit'
      : 'doctorDetails.consultationFees.video';

  if (minFee || maxFee) {
    filter[feeField] = {};
    if (minFee) (filter[feeField] as Record<string, number>).$gte = Number(minFee);
    if (maxFee) (filter[feeField] as Record<string, number>).$lte = Number(maxFee);
  }

  if (search) {
    const term = (search as string).trim();
    const parts = term.split(/\s+/).filter(Boolean);
    const orConditions: Record<string, unknown>[] = [
      { 'profile.firstName': { $regex: term, $options: 'i' } },
      { 'profile.lastName': { $regex: term, $options: 'i' } },
      { 'doctorDetails.specializations': { $regex: term, $options: 'i' } },
      { 'doctorDetails.qualifications': { $regex: term, $options: 'i' } },
      { 'doctorDetails.hospitalAffiliations': { $regex: term, $options: 'i' } },
    ];
    if (parts.length >= 2) {
      orConditions.push({
        $and: [
          { 'profile.firstName': { $regex: parts[0], $options: 'i' } },
          { 'profile.lastName': { $regex: parts.slice(1).join(' '), $options: 'i' } },
        ],
      });
    }
    filter.$or = orConditions;
  }

  const sortOptions: Record<string, 1 | -1> = {};
  switch (sort) {
    case 'experience':
      sortOptions['doctorDetails.experience'] = -1;
      break;
    case 'fee-low':
      sortOptions[feeField] = 1;
      break;
    case 'fee-high':
      sortOptions[feeField] = -1;
      break;
    case 'rating':
      sortOptions['doctorDetails.rating'] = -1;
      sortOptions['doctorDetails.reviewCount'] = -1;
      break;
    case 'relevance':
    default:
      sortOptions['doctorDetails.rating'] = -1;
      sortOptions['doctorDetails.reviewCount'] = -1;
      sortOptions['doctorDetails.experience'] = -1;
      break;
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  let doctors;
  let totalFiltered: number;

  if (availableToday === 'true') {
    const allCandidates = await User.find(filter)
      .select('-password')
      .sort(sortOptions)
      .limit(200);
    const available = [];
    for (const doc of allCandidates) {
      if (await isAvailableToday(doc)) available.push(doc);
    }
    totalFiltered = available.length;
    doctors = available.slice(skip, skip + limitNum);
  } else {
    totalFiltered = await User.countDocuments(filter);
    doctors = await User.find(filter)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);
  }

  const doctorsWithSlots = await Promise.all(
    doctors.map(async (doc) => {
      const nextSlot = await getNextAvailableSlot(doc);
      const sanitized = sanitizeUser(doc) as Record<string, unknown>;
      return {
        ...sanitized,
        nextAvailableSlot: nextSlot,
        displayFee:
          mode === 'in-clinic'
            ? doc.doctorDetails?.consultationFees?.homeVisit
            : doc.doctorDetails?.consultationFees?.video,
      };
    })
  );

  res.json({
    success: true,
    data: {
      doctors: doctorsWithSlots,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalFiltered,
        pages: Math.ceil(totalFiltered / limitNum) || 1,
      },
    },
  });
});

async function getRatingBreakdown(doctorId: string) {
  const reviews = await Review.find({
    reviewType: 'doctor',
    reviewFor: doctorId,
    status: 'approved',
  }).select('rating');

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[star]++;
  });
  const total = reviews.length;
  return { breakdown, total };
}

export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await User.findOne({
    _id: req.params.id,
    userType: 'doctor',
  }).select('-password');

  if (!doctor) {
    res.status(404).json({ success: false, message: 'Doctor not found' });
    return;
  }

  const reviews = await Review.find({
    reviewType: 'doctor',
    reviewFor: doctor._id,
    status: 'approved',
  })
    .populate('reviewedBy', 'profile.firstName profile.lastName profile.profilePhoto')
    .sort({ createdAt: -1 })
    .limit(50);

  const { breakdown: ratingBreakdown, total: ratingTotal } = await getRatingBreakdown(
    doctor._id.toString()
  );

  const nextAvailableSlot = await getNextAvailableSlot(doctor);

  const primarySpec = doctor.doctorDetails?.specializations?.[0];
  const similarDoctors = await User.find({
    _id: { $ne: doctor._id },
    userType: 'doctor',
    isActive: true,
    isBlocked: false,
    'doctorDetails.verified': true,
    ...(primarySpec ? { 'doctorDetails.specializations': primarySpec } : {}),
  })
    .select('-password')
    .sort({ 'doctorDetails.rating': -1 })
    .limit(4);

  const similarWithSlots = await Promise.all(
    similarDoctors.map(async (d) => ({
      ...sanitizeUser(d),
      nextAvailableSlot: await getNextAvailableSlot(d),
    }))
  );

  // Build clinic from affiliations if missing
  const sanitized = sanitizeUser(doctor) as Record<string, unknown>;
  const details = sanitized.doctorDetails as Record<string, unknown> | undefined;
  if (details && !details.clinic && details.hospitalAffiliations) {
    const affiliations = details.hospitalAffiliations as string[];
    const profile = sanitized.profile as { address?: { city?: string; state?: string } };
    details.clinic = {
      name: affiliations[0],
      address: `${affiliations[0]}, ${profile?.address?.city || 'India'}`,
      city: profile?.address?.city,
      state: profile?.address?.state,
      coordinates: getCityCoordinates(profile?.address?.city),
    };
  }

  res.json({
    success: true,
    data: {
      doctor: { ...sanitized, nextAvailableSlot },
      reviews,
      ratingBreakdown,
      ratingTotal,
      similarDoctors: similarWithSlots,
    },
  });
});

function getCityCoordinates(city?: string): { lat: number; lng: number } {
  const coords: Record<string, { lat: number; lng: number }> = {
    Mumbai: { lat: 19.076, lng: 72.8777 },
    Delhi: { lat: 28.6139, lng: 77.209 },
    Bangalore: { lat: 12.9716, lng: 77.5946 },
    Hyderabad: { lat: 17.385, lng: 78.4867 },
    Pune: { lat: 18.5204, lng: 73.8567 },
    Chennai: { lat: 13.0827, lng: 80.2707 },
    Kolkata: { lat: 22.5726, lng: 88.3639 },
    Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  };
  return coords[city || ''] || { lat: 20.5937, lng: 78.9629 };
}

export const getDoctorAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  const doctor = await User.findOne({ _id: req.params.id, userType: 'doctor' });

  if (!doctor) {
    res.status(404).json({ success: false, message: 'Doctor not found' });
    return;
  }

  const targetDate = date ? new Date(date as string) : new Date();
  const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

  const dayAvailability = doctor.doctorDetails?.availability?.find((a) => a.day === dayName);

  const dateStart = new Date(targetDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(targetDate);
  dateEnd.setHours(23, 59, 59, 999);

  const bookedSlots = await Appointment.find({
    doctorId: doctor._id,
    scheduledDate: { $gte: dateStart, $lte: dateEnd },
    status: { $nin: ['cancelled'] },
  }).select('scheduledTime');

  const bookedTimes = bookedSlots.map((a) => a.scheduledTime);

  let availableSlots: string[] = [];
  if (dayAvailability?.slots?.length) {
    const ranges = dayAvailability.slots;
    availableSlots = TIME_SLOTS.filter((slot) =>
      ranges.some((r) => slot >= r.startTime && slot < r.endTime)
    );
  } else if (!doctor.doctorDetails?.availability?.length) {
    availableSlots = TIME_SLOTS;
  }

  const slots = availableSlots.map((time) => ({
    time,
    available: !bookedTimes.includes(time),
  }));

  res.json({ success: true, data: { date: targetDate, day: dayName, slots } });
});

export const getFeaturedDoctors = asyncHandler(async (_req: Request, res: Response) => {
  const doctors = await User.find({
    userType: 'doctor',
    isActive: true,
    'doctorDetails.verified': true,
  })
    .select('-password')
    .sort({ 'doctorDetails.rating': -1 })
    .limit(8);

  const enriched = await Promise.all(
    doctors.map(async (doc) => {
      const nextSlot = await getNextAvailableSlot(doc);
      return { ...sanitizeUser(doc), nextAvailableSlot: nextSlot };
    })
  );

  res.json({ success: true, data: enriched });
});

export const getDoctorDashboard = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayAppointments, totalAppointments, completedAppointments] = await Promise.all([
    Appointment.find({
      doctorId: req.user!.userId,
      scheduledDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ['cancelled'] },
    })
      .populate('patientId', 'profile.firstName profile.lastName profile.profilePhoto')
      .sort({ scheduledTime: 1 }),
    Appointment.countDocuments({ doctorId: req.user!.userId }),
    Appointment.countDocuments({ doctorId: req.user!.userId, status: 'completed' }),
  ]);

  res.json({
    success: true,
    data: {
      todayAppointments,
      stats: { totalAppointments, completedAppointments },
    },
  });
});

export const getMyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await User.findOne({ _id: req.user!.userId, userType: 'doctor' }).select(
    'doctorDetails.availability'
  );
  if (!doctor) {
    res.status(404).json({ success: false, message: 'Doctor not found' });
    return;
  }
  res.json({ success: true, data: doctor.doctorDetails?.availability ?? [] });
});

export const updateMyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { availability } = req.body as {
    availability: Array<{ day: string; slots: Array<{ startTime: string; endTime: string }> }>;
  };

  const doctor = await User.findOne({ _id: req.user!.userId, userType: 'doctor' });
  if (!doctor) {
    res.status(404).json({ success: false, message: 'Doctor not found' });
    return;
  }

  if (!doctor.doctorDetails) {
    doctor.doctorDetails = {} as NonNullable<typeof doctor.doctorDetails>;
  }
  doctor.doctorDetails.availability = availability;
  await doctor.save();

  res.json({ success: true, data: doctor.doctorDetails.availability });
});
