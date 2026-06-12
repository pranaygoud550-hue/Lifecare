import type { ScanReport } from './mediscan';

export type UserType = 'patient' | 'doctor' | 'pharmacy' | 'ambulance' | 'admin';

export interface User {
  _id: string;
  userType: UserType;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isBlocked?: boolean;
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    profilePhoto?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
    };
  };
  doctorDetails?: {
    registrationNumber?: string;
    qualifications?: string[];
    specializations?: string[];
    experience?: number;
    languages?: string[];
    bio?: string;
    consultationFees?: {
      video?: number;
      audio?: number;
      chat?: number;
      homeVisit?: number;
    };
    verified?: boolean;
    verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    verificationDocuments?: {
      medicalLicenseNumber?: string;
      medicalLicenseFile?: string;
      degreeCertificateFile?: string;
      identityProofFile?: string;
      submittedAt?: string;
    };
    rejectionReason?: string;
    verifiedAt?: string;
    rating?: number;
    reviewCount?: number;
    consultationTypes?: string[];
    hospitalAffiliations?: string[];
    clinic?: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      coordinates?: { lat: number; lng: number };
    };
    education?: Array<{
      degree: string;
      institution: string;
      year?: number;
    }>;
    awards?: string[];
  };
  medicalHistory?: {
    bloodGroup?: string;
    heightCm?: number;
    weightKg?: number;
    organDonor?: boolean;
    smokingStatus?: string;
    alcoholUse?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
    familyHistory?: string[];
    insuranceProvider?: string;
    insuranceNumber?: string;
    profileCompleted?: boolean;
  };
  pharmacyDetails?: {
    pharmacyName?: string;
    verified?: boolean;
  };
  wallet?: {
    balance: number;
    transactions: WalletTransaction[];
  };
}

export interface WalletTransaction {
  _id?: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: string;
  balanceAfter?: number;
  category?: 'topup' | 'appointment' | 'pharmacy' | 'refund' | 'other';
  appointmentId?: string;
  paymentIntentId?: string;
  refundStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'completed';
}

export interface WalletMonthlySummary {
  month: string;
  totalSpent: number;
  totalTopUps: number;
  previousMonthSpent: number;
  transactionCount: number;
}

export interface Prescription {
  _id: string;
  appointmentId: string | Appointment;
  patientId: User | string;
  doctorId: User | string;
  date: string;
  diagnosis?: string;
  medications: Array<{
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    beforeAfterFood?: string;
  }>;
  labTests?: string[];
  advice?: string;
  followUpDate?: string;
  createdAt: string;
}

export interface HealthRecord {
  _id: string;
  patientId: string;
  recordType: 'lab-report' | 'prescription' | 'image' | 'vaccination' | 'other';
  title: string;
  description?: string;
  date: string;
  tags?: string[];
  files: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: string;
  }>;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  sentAt: string;
  readAt?: string;
}

export interface Review {
  _id: string;
  reviewType: string;
  reviewFor: string | User;
  reviewedBy: User | string;
  rating: number;
  review?: string;
  helpful?: number;
  isVerified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  response?: { message: string; timestamp: string };
}

export interface RatingBreakdown {
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
}

export interface DoctorProfileResponse {
  doctor: Doctor;
  reviews: Review[];
  ratingBreakdown: Record<number, number>;
  ratingTotal: number;
  similarDoctors: Doctor[];
}

export interface AdminDashboard {
  kpis: {
    totalUsers: number;
    totalPatients: number;
    totalDoctors: number;
    activeDoctors: number;
    todayAppointments: number;
    weekAppointments: number;
    revenueThisMonth: number;
    pendingVerifications: number;
    pendingDoctorVerifications: number;
  };
  users: { patients: number; doctors: number; pharmacies: number };
  services: { appointments: number; orders: number; ambulanceRequests: number };
  pendingVerifications: number;
  recentActivity: PlatformActivity[];
  platformHealth: PlatformHealth;
  charts: {
    dailyWalletTopups: { date: string; revenue: number; label: string }[];
    dailyRevenue: { date: string; revenue: number; label: string }[];
    appointmentsBySpecialization: { specialization: string; count: number }[];
  };
}

export type PlatformActivityType =
  | 'user_registered'
  | 'appointment_booked'
  | 'appointment_completed'
  | 'order_placed'
  | 'wallet_topup'
  | 'emergency_sos'
  | 'prescription_issued';

export interface PlatformActivity {
  id: string;
  type: PlatformActivityType;
  title: string;
  subtitle: string;
  timestamp: string;
}

export interface PlatformHealth {
  apiResponseTimeMs: number;
  database: { status: string; state: string; inMemory: boolean; name: string | null };
  socketConnections: number;
  timestamp: string;
}

export interface RevenueReport {
  revenue: { consultation: number; pharmacy: number; ambulance: number; total: number };
  trends: { appointmentsLast30Days: number; ordersLast30Days: number; newUsersLast30Days: number };
  topDoctors: Doctor[];
}

export interface NextAvailableSlot {
  date: string;
  time: string;
  label: string;
}

export interface Doctor extends User {
  doctorDetails: NonNullable<User['doctorDetails']>;
  nextAvailableSlot?: NextAvailableSlot | null;
  displayFee?: number;
}

export interface Appointment {
  _id: string;
  appointmentId: string;
  patientId: User | string;
  doctorId: User | string;
  consultationType: 'video' | 'audio' | 'chat' | 'homeVisit';
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: string;
  chiefComplaint?: string;
  patientNotes?: string;
  scanReportId?: ScanReport | string;
  payment: {
    amount: number;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | string;
    method?: string;
    transactionId?: string;
    paymentIntentId?: string;
    failureReason?: string;
  };
  rating?: { score: number; review?: string };
}

export type VitalType = 'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'oxygen';
export type GlucoseMealContext = 'fasting' | 'post_meal';

export interface VitalReading {
  _id: string;
  patientId: string;
  type: VitalType;
  recordedAt: string;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  glucoseMeal?: GlucoseMealContext;
  value?: number;
  unit?: string;
  notes?: string;
  createdAt?: string;
}

export interface VitalsSummary {
  readings: VitalReading[];
  latest: VitalReading[];
  periodDays: number;
}

export interface PharmacyOrder {
  _id: string;
  orderId: string;
  items: Array<{ medicineName: string; quantity: number; price: number }>;
  pricing: { total: number };
  delivery: { currentStatus: string; type?: string };
  payment?: { status: string };
  createdAt: string;
}

export interface Medicine {
  _id: string;
  name: string;
  genericName?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  form?: string;
  packSize?: string;
  prescriptionRequired: boolean;
  pricing: {
    mrp: number;
    sellingPrice: number;
    discount?: number;
  };
  stock: number;
  rating?: number;
}

export interface TransportBooking {
  _id: string;
  bookingId: string;
  flowType: string;
  status: string;
  pickupLocation: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  destinationHospital?: { name: string; address: string };
  estimatedArrival?: string;
  otp?: string;
  trackingToken?: string;
  patientDetails?: { name: string; contactNumber: string };
  assignedDriverId?: User | string;
}

export interface TransportSosResponse {
  booking: TransportBooking;
  match?: {
    driverId: string;
    driverName: string;
    vehicleNumber?: string;
    phone?: string;
    distanceKm?: number;
    rating?: number;
    certifications?: string[];
    policeVerified?: boolean;
  } | null;
  expandedSearch?: boolean;
  trackingUrl: string;
}

export interface TransportTrackData {
  booking: Partial<TransportBooking> & {
    vehicleType?: string;
    otp?: string;
  };
  driver?: {
    name: string;
    vehicleNumber?: string;
    phone?: string;
    rating?: number;
    location?: { lat: number; lng: number };
  } | null;
  patientLocation: { lat: number; lng: number };
  hospitalLocation?: {
    lat: number;
    lng: number;
    name: string;
    address?: string;
  } | null;
  etaMinutes?: number | null;
  etaToHospital?: number | null;
  tracking?: {
    otp?: string;
    trackingToken?: string;
    trackingExpiresAt?: string;
  };
}

export type EmergencyType = 'cardiac' | 'accident' | 'breathing' | 'other';

export type EmergencyRequestStatus =
  | 'searching'
  | 'dispatched'
  | 'arrived'
  | 'pickedUp'
  | 'atHospital'
  | 'completed'
  | 'cancelled';

export interface EmergencyAmbulanceInfo {
  _id: string;
  vehicleNumber: string;
  status: string;
  isAvailable: boolean;
  currentLocation: { lat: number; lng: number };
  distanceMeters: number;
  etaMinutes: number | null;
  driver: {
    _id: string;
    name: string;
    phone: string | null;
  } | null;
}

export interface EmergencyHospitalInfo {
  _id: string;
  name: string;
  address: string;
  phone: string | null;
  city?: string;
  state?: string;
  specialties?: string[];
  emergencyAvailable?: boolean;
  coordinates?: { lat: number; lng: number } | null;
  distanceMeters: number;
}

export interface SmartHospitalRecommendation {
  reason: string;
  scanContext: {
    prediction: string;
    confidence: number;
    explanation: string;
  } | null;
  alternatives?: Array<{
    place_id?: string;
    name: string;
    distance?: string;
    specialtyTags?: string[];
  }>;
}

export interface EmergencySosDispatchData {
  requestId: string;
  estimatedArrival: string;
  calculatedETA: number;
  isDelayed: boolean;
  ambulancesEvaluated?: number;
  nearestHospital: EmergencyHospitalInfo | null;
  assignedAmbulance: EmergencyAmbulanceInfo;
  candidateAmbulances?: EmergencyAmbulanceInfo[];
  trackLink: string;
  smartRecommendation?: SmartHospitalRecommendation | null;
}

export interface EmergencyLiveEtaData {
  requestId: string;
  status: EmergencyRequestStatus;
  isDelayed: boolean;
  calculatedETA: number;
  estimatedArrival: string;
  distanceKm: number;
  adjustedDistanceKm?: number;
  trafficMultiplier?: number;
  ambulanceLocation: { lat: number; lng: number };
  patientLocation: { lat: number; lng: number };
  assignedAmbulance: EmergencyAmbulanceInfo;
  recalculatedAt: string;
}

export interface NearbyHospitalsResponse {
  count: number;
  radiusKm: number;
  patientLocation: { lat: number; lng: number };
  hospitals: EmergencyHospitalInfo[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CitySearchResult {
  city: string;
  state: string;
  doctorCount: number;
  hospitalCount: number;
}

export interface Hospital {
  _id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  address: string;
  pincode?: string;
  phone?: string;
  type: string;
  specialties: string[];
  emergencyAvailable: boolean;
  beds?: number;
  rating: number;
  reviewCount: number;
}
