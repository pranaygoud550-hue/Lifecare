import { z } from 'zod';
import { sanitizeText } from './sanitize.js';
import { normalizePhone, isValidIndianMobile } from './phone.js';

const phoneField = z
  .string()
  .min(10, 'Invalid phone number')
  .max(15)
  .transform(normalizePhone)
  .refine(isValidIndianMobile, 'Enter a valid 10-digit mobile number');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

/** Stricter password rules for optional flows (wallet, profile, etc.) */
export const strongPasswordSchema = passwordSchema
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const isoDateString = z
  .string()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const appointmentTimeString = z
  .string()
  .min(1, 'Time is required')
  .max(10)
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM (24-hour)');

const safeStr = (max = 2000) => z.string().max(max).transform(sanitizeText);
const safeStrOpt = (max = 2000) => safeStr(max).optional();

const optionalPositiveNumber = (max: number) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, z.number().positive().max(max).optional());

const optionalCleanString = (max: number) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    safeStrOpt(max)
  );
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const objectIdParam = z.string().min(1, 'ID is required');

// —— Auth ——
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').transform((e) => e.toLowerCase().trim()),
    password: passwordSchema,
  }),
});

export const demoLoginSchema = z.object({
  body: z.object({
    phone: phoneField.optional(),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: phoneField,
    purpose: z.enum(['login', 'register']),
  }),
});

export const loginOtpSchema = z.object({
  body: z.object({
    phone: phoneField,
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    phone: phoneField,
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
});

export const unlockAccountSchema = z.object({
  body: z.object({
    token: z.string().min(32, 'Invalid unlock token'),
  }),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      profile: z
        .object({
          firstName: safeStr(80).optional(),
          lastName: safeStr(80).optional(),
          gender: safeStrOpt(30),
          dateOfBirth: z.string().optional(),
        })
        .optional(),
    })
    .passthrough(),
});

const medicalHistorySchema = z
  .object({
    bloodGroup: safeStr(10),
    heightCm: z.number().positive().max(300).optional(),
    weightKg: z.number().positive().max(500).optional(),
    organDonor: z.boolean().optional(),
    smokingStatus: safeStrOpt(50),
    alcoholUse: safeStrOpt(50),
    allergies: z.array(safeStr(200)).max(50).optional(),
    chronicConditions: z.array(safeStr(200)).max(50).optional(),
    currentMedications: z.array(safeStr(200)).max(50).optional(),
    familyHistory: z.array(safeStr(200)).max(50).optional(),
    insuranceProvider: safeStrOpt(120),
    insuranceNumber: safeStrOpt(80),
  })
  .optional();

export const registerWithOtpSchema = z.object({
  body: z.object({
    userType: z.enum(['patient', 'doctor', 'pharmacy', 'ambulance']),
    phone: phoneField,
    firstName: safeStr(80),
    lastName: safeStr(80),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    email: z
      .string()
      .email('Invalid email address')
      .transform((e) => e.toLowerCase().trim())
      .optional(),
    password: passwordSchema.optional(),
    dateOfBirth: z.string().optional(),
    gender: safeStrOpt(30),
    medicalHistory: medicalHistorySchema,
    registrationNumber: safeStrOpt(80),
    specializations: z.array(safeStr(100)).max(20).optional(),
    experience: z.number().min(0).max(60).optional(),
    pharmacyName: safeStrOpt(200),
    licenseNumber: safeStrOpt(80),
    vehicleNumber: safeStrOpt(30),
    vehicleType: safeStrOpt(30),
  }),
});

export const updateMedicalHistorySchema = z.object({
  body: z.object({
    bloodGroup: safeStr(10),
    heightCm: optionalPositiveNumber(300),
    weightKg: optionalPositiveNumber(500),
    organDonor: z.boolean().optional(),
    smokingStatus: optionalCleanString(50),
    alcoholUse: optionalCleanString(50),
    allergies: z.array(safeStr(200)).max(50).optional(),
    chronicConditions: z.array(safeStr(200)).max(50).optional(),
    currentMedications: z.array(safeStr(200)).max(50).optional(),
    familyHistory: z.array(safeStr(200)).max(50).optional(),
    insuranceProvider: optionalCleanString(120),
    insuranceNumber: optionalCleanString(80),
    dateOfBirth: optionalCleanString(10),
    gender: optionalCleanString(30),
  }),
});

// —— Doctors ——
export const doctorsQuerySchema = z.object({
  query: z.object({
    specialty: safeStrOpt(100),
    city: safeStrOpt(100),
    search: safeStrOpt(200),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sort: safeStrOpt(50),
    minFee: z.string().regex(/^\d+$/).optional(),
    maxFee: z.string().regex(/^\d+$/).optional(),
  }),
});

export const doctorIdParamSchema = z.object({
  params: z.object({ id: objectIdParam }),
});

export const doctorAvailabilityQuerySchema = z.object({
  params: z.object({ id: objectIdParam }),
  query: z.object({ date: z.string().optional() }),
});

// —— Appointments ——
export const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId: objectId,
    consultationType: z.enum(['video', 'audio', 'chat', 'homeVisit']),
    scheduledDate: isoDateString,
    scheduledTime: appointmentTimeString,
    chiefComplaint: safeStrOpt(2000),
    patientNotes: safeStrOpt(2000),
    attachments: z.array(z.string().url().or(z.string().startsWith('/'))).max(10).optional(),
    homeVisitAddress: z
      .object({
        street: safeStr(300),
        city: safeStr(100),
        pincode: z.string().max(10),
        coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
      })
      .optional(),
    scanReportId: objectId.optional(),
  }),
});

export const appointmentIdParamSchema = z.object({
  params: z.object({ id: objectIdParam }),
});

export const confirmAppointmentPaymentSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    method: z.enum(['wallet', 'card', 'clinic']),
    paymentIntentId: z.string().max(200).optional(),
  }),
});

export const rejectAppointmentSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({ reason: safeStrOpt(500) }),
});

export const cancelAppointmentSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({ reason: safeStrOpt(500) }).optional(),
});

export const appointmentsQuerySchema = z.object({
  query: z.object({
    status: safeStrOpt(30),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const rateAppointmentSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    score: z.number().min(1).max(5),
    review: safeStrOpt(2000),
  }),
});

// —— Pharmacy ——
export const medicinesQuerySchema = z.object({
  query: z.object({
    search: safeStrOpt(200),
    category: safeStrOpt(100),
    form: safeStrOpt(50),
    sort: safeStrOpt(50),
    order: z.enum(['asc', 'desc']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    minPrice: z.string().regex(/^\d+$/).optional(),
    maxPrice: z.string().regex(/^\d+$/).optional(),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          medicineId: objectId,
          quantity: z.number().int().min(1).max(99),
        })
      )
      .min(1)
      .max(50),
    deliveryAddress: z.object({
      name: safeStr(120),
      phone: z.string().min(10).max(15),
      street: safeStr(300),
      city: safeStr(100),
      state: safeStr(100),
      pincode: z.string().max(10),
    }),
    deliveryType: z.enum(['standard', 'express', 'same-day']).default('standard'),
    paymentMethod: safeStr(50),
  }),
});

// —— Ambulance ——
export const ambulanceRequestSchema = z.object({
  body: z.object({
    emergencyType: safeStr(100),
    severity: z.enum(['critical', 'urgent', 'non-urgent']),
    pickupLocation: z.object({
      address: safeStr(500),
      coordinates: z.object({ lat: z.number(), lng: z.number() }),
      landmark: safeStrOpt(200),
    }),
    patientDetails: z.object({
      name: safeStr(120),
      age: z.number().int().min(0).max(150),
      gender: safeStr(30),
      condition: safeStr(500),
      contactNumber: z.string().min(10).max(15),
    }),
    ambulanceType: safeStr(30),
  }),
});

export const ambulanceStatusSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    status: safeStr(50),
    location: z.object({ lat: z.number(), lng: z.number() }).optional(),
  }),
});

export const driverLocationSchema = z.object({
  body: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

// —— Emergency SOS ——
export const emergencySosSchema = z.object({
  body: z
    .object({
      patientLat: z.number().min(-90).max(90),
      patientLng: z.number().min(-180).max(180),
      emergencyType: z.enum(['cardiac', 'accident', 'breathing', 'other']),
      patientId: objectId.optional(),
      userId: objectId.optional(),
    })
    .refine((data) => Boolean(data.patientId || data.userId), {
      message: 'patientId or userId is required',
      path: ['patientId'],
    }),
});

export const emergencyRequestIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Request ID is required'),
  }),
});

export const nearbyHospitalsQuerySchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().positive().max(100).optional().default(25),
  }),
});

export const hospitalRoutePreviewQuerySchema = z.object({
  query: z.object({
    originLat: z.coerce.number().min(-90).max(90),
    originLng: z.coerce.number().min(-180).max(180),
    destLat: z.coerce.number().min(-90).max(90),
    destLng: z.coerce.number().min(-180).max(180),
  }),
});

export const ambulanceLocationPatchSchema = z.object({
  body: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    ambulanceId: objectId,
  }),
});

export const driverAvailabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean(),
  }),
});

export const nearbyGooglePlacesQuerySchema = z.object({
  query: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      radius: z.coerce.number().positive().max(100).optional().default(5),
      type: z.enum(['all', 'hospital', 'clinic', 'pharmacy', 'diagnostic']).optional(),
      sort: z.enum(['distance', 'rating', 'open']).optional(),
      openNow: z.enum(['true', 'false']).optional(),
    })
    .refine((q) => Number.isFinite(q.lat) && Number.isFinite(q.lng), {
      message: 'lat and lng are required',
    }),
});

export const googlePlaceDetailsParamSchema = z.object({
  params: z.object({
    place_id: z.string().min(10),
  }),
});

export const smartHospitalQuerySchema = z.object({
  query: z
    .object({
      patientId: objectId.optional(),
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      radius: z.coerce.number().positive().max(100).optional().default(15),
    })
    .refine((q) => Number.isFinite(q.lat) && Number.isFinite(q.lng), {
      message: 'lat and lng are required',
    }),
});

export const navigationRouteBodySchema = z.object({
  body: z.object({
    originLat: z.number().min(-90).max(90),
    originLng: z.number().min(-180).max(180),
    destLat: z.number().min(-90).max(90),
    destLng: z.number().min(-180).max(180),
    mode: z.enum(['driving', 'walking', 'ambulance']).optional().default('driving'),
  }),
});

export const navigationEtaQuerySchema = z.object({
  query: z
    .object({
      requestId: z.string().min(1).optional(),
      id: z.string().min(1).optional(),
    })
    .refine((q) => Boolean(q.requestId || q.id), {
      message: 'requestId is required',
      path: ['requestId'],
    }),
});

// —— Prescriptions ——
export const createPrescriptionSchema = z.object({
  body: z.object({
    appointmentId: objectId,
    diagnosis: safeStrOpt(1000),
    medications: z
      .array(
        z.object({
          medicineName: safeStr(200),
          dosage: safeStr(100),
          frequency: safeStr(100),
          duration: safeStr(100),
          instructions: safeStrOpt(500),
          beforeAfterFood: safeStrOpt(50),
        })
      )
      .min(1)
      .max(30),
    labTests: z.array(safeStr(200)).max(20).optional(),
    advice: safeStrOpt(2000),
    followUpDate: z.string().optional(),
  }),
});

// —— Health records ——
export const healthRecordsQuerySchema = z.object({
  query: z.object({
    recordType: safeStrOpt(50),
    search: safeStrOpt(200),
  }),
});

export const shareHealthRecordSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    doctorId: objectId.optional(),
    email: z.string().email().optional(),
  }),
});

// —— Wallet ——
export const walletTopUpSchema = z.object({
  body: z.object({
    amount: z.number().min(100).max(50000),
  }),
});

export const walletConfirmTopUpSchema = z.object({
  body: z.object({
    paymentIntentId: z.string().min(1).max(200),
  }),
});

export const walletAddMoneySchema = z.object({
  body: z.object({
    amount: z.number().min(1).max(50000),
  }),
});

export const walletPaySchema = z.object({
  body: z.object({
    amount: z.number().min(1),
    description: safeStrOpt(300),
  }),
});

export const walletTransactionsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const walletRefundParamSchema = z.object({
  params: z.object({ transactionId: objectIdParam }),
});

// —— Reviews ——
export const reviewSchema = z.object({
  body: z.object({
    reviewType: z.enum(['doctor', 'pharmacy', 'ambulance', 'medicine']),
    reviewFor: objectId,
    relatedTo: objectId.optional(),
    rating: z.number().min(1).max(5),
    review: safeStrOpt(2000),
  }),
});

export const reviewRespondSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({ message: safeStr(2000) }),
});

// —— Vitals ——
export const logVitalSchema = z.object({
  body: z
    .object({
      type: z.enum(['blood_pressure', 'blood_sugar', 'weight', 'heart_rate', 'oxygen']),
      recordedAt: z.string().optional(),
      systolic: z.number().optional(),
      diastolic: z.number().optional(),
      glucose: z.number().optional(),
      glucoseMeal: z.enum(['fasting', 'post_meal']).optional(),
      value: z.number().optional(),
      unit: safeStrOpt(20),
      notes: safeStrOpt(500),
    })
    .superRefine((data, ctx) => {
      if (data.type === 'blood_pressure') {
        if (data.systolic == null || data.diastolic == null) {
          ctx.addIssue({ code: 'custom', message: 'Systolic and diastolic required' });
        }
      } else if (data.type === 'blood_sugar') {
        if (data.glucose == null || !data.glucoseMeal) {
          ctx.addIssue({ code: 'custom', message: 'Glucose value and meal context required' });
        }
      } else if (data.value == null) {
        ctx.addIssue({ code: 'custom', message: 'Value required' });
      }
    }),
});

export const vitalsQuerySchema = z.object({
  query: z.object({
    type: safeStrOpt(30),
    days: z.string().regex(/^\d+$/).optional(),
  }),
});

export const vitalIdParamSchema = z.object({
  params: z.object({ id: objectIdParam }),
});

export const dietLogSchema = z.object({
  body: z
    .object({
      mealSlot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
      status: z.enum(['followed', 'missed', 'off_plan']),
      actualFood: safeStrOpt(500),
      offPlanDescription: safeStrOpt(500),
      offPlanCategory: z
        .enum(['fried', 'sweets', 'salty', 'fast_food', 'large_portion', 'skipped_meal', 'other'])
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.status === 'off_plan') {
        const food = (data.actualFood || data.offPlanDescription || '').trim();
        if (!food) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please tell us what you ate so we can balance your next meal',
            path: ['actualFood'],
          });
        }
      }
    }),
});

export const dietLogsQuerySchema = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).optional(),
  }),
});

// —— Payments ——
export const createPaymentIntentSchema = z.object({
  body: z.object({
    amount: z.number().positive().max(1000000),
    currency: z.string().length(3).optional(),
    metadata: z.record(safeStr(200)).optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    paymentIntentId: z.string().min(1).max(200),
    type: z.enum(['appointment', 'order', 'ambulance']),
    referenceId: objectId,
  }),
});

export const applyCouponSchema = z.object({
  body: z.object({
    code: safeStr(50),
    orderAmount: z.number().positive(),
    applicableOn: safeStrOpt(50),
  }),
});

// —— Notifications ——
export const notificationsQuerySchema = z.object({
  query: z.object({
    type: safeStrOpt(50),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

// —— Admin ——
export const adminUsersQuerySchema = z.object({
  query: z.object({
    userType: z.enum(['patient', 'doctor', 'pharmacy', 'ambulance', 'admin']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const adminBlockUserSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({ isBlocked: z.boolean() }),
});

export const adminRejectDoctorSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({ reason: z.string().min(5).max(500) }),
});

export const adminModerateReviewSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({ status: z.enum(['approved', 'rejected']) }),
});

// —— Transport ——
const transportCoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const transportRequestSchema = z.object({
  body: z.object({
    vehicleType: safeStr(50),
    pickupLocation: z.object({
      address: safeStr(500),
      coordinates: transportCoordinatesSchema,
      landmark: safeStrOpt(200),
    }),
    destinationHospital: z
      .object({
        name: safeStr(200),
        address: safeStr(500),
        coordinates: transportCoordinatesSchema.optional(),
      })
      .optional(),
    patientDetails: z
      .object({
        name: safeStr(120),
        age: z.number().int().min(0).max(150).optional(),
        gender: safeStrOpt(30),
        condition: safeStrOpt(500),
        contactNumber: z.string().min(10, 'Contact number required').max(15),
        bookedFor: z.enum(['self', 'other']).optional(),
        otherPersonName: safeStrOpt(120),
        otherPersonRelation: safeStrOpt(80),
      })
      .optional(),
    scheduledAt: z.string().optional(),
    conditionNotes: safeStrOpt(1000),
    guestContact: z
      .object({
        name: safeStr(120),
        phone: phoneField,
      })
      .optional(),
    triage: z
      .object({
        lifeThreatening: safeStr(50),
        canWalk: safeStr(50),
        remoteDoctor: safeStr(50),
      })
      .optional(),
  }),
});

export const transportStatusSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    status: safeStr(50),
    location: z.object({ lat: z.number(), lng: z.number() }).optional(),
  }),
});

export const transportOtpSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({ otp: z.string().length(4).or(z.string().length(6)) }),
});

// —— MediScan ——
export const scanUploadBodySchema = z.object({
  body: z.object({
    scanType: z.enum(['chest_xray', 'skin_lesion', 'retina']),
    appointmentId: objectId.optional(),
    doctorId: objectId.optional(),
  }),
});

export const scanShareSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    doctorId: objectId.optional(),
  }),
});

export const chestScanShareSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    doctorId: objectId.optional(),
  }),
});

export const chestScanNoteSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    doctorNote: safeStr(4000),
  }),
});

export const scanReviewSchema = z.object({
  params: z.object({ id: objectIdParam }),
  body: z.object({
    doctorNote: safeStrOpt(4000),
    doctorOverride: safeStrOpt(500),
    markFinal: z.boolean().optional(),
    aiConfirmed: z.boolean().optional(),
    requestMoreTests: z.boolean().optional(),
    reviewDurationSeconds: z.number().min(0).max(86400).optional(),
  }),
});

export const doctorScansQuerySchema = z.object({
  query: z.object({
    status: z
      .enum(['pending', 'ai_analyzed', 'ai_unavailable', 'doctor_reviewed', 'final'])
      .optional(),
    scanType: z.enum(['chest_xray', 'skin_lesion', 'retina']).optional(),
  }),
});

// Legacy re-exports
export const registerSchema = registerWithOtpSchema;
