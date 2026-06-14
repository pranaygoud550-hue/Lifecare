import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';
import type {
  User, Doctor, Appointment, Medicine, ApiResponse, AuthSessionData,
  Prescription, HealthRecord, Notification, AdminDashboard, RevenueReport, PharmacyOrder, VitalsSummary, VitalReading,
  PlatformHealth, Review,
  DoctorProfileResponse,   TransportSosResponse, TransportTrackData,
  EmergencySosDispatchData, EmergencyLiveEtaData, NearbyHospitalsResponse, EmergencyType,
} from '@/types';
import type { DoctorScanAnalytics, ScanReport, ScanReviewPayload } from '@/types/mediscan';
import type { ChestScan } from '@/types/chestScan';
import type { GoogleHospitalPlace, HospitalRoutePreviewData, NavigationRouteData, NavigationEtaData, SmartHospitalRecommendation } from '@/types/googleMaps';
import type { WellnessPlan, DietLogEntry, MealSlot, DietAdherenceStatus, OffPlanCategory } from '@/types/wellness';
import type { DoctorCarePlan, DoctorPatientDetail, DoctorPatientListItem, HealthDataSharing } from '@/types/doctorCare';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  keepUnusedDataFor: 120,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  tagTypes: ['User', 'Doctors', 'Appointments', 'Medicines', 'Orders', 'Ambulance', 'Prescriptions', 'HealthRecords', 'Notifications', 'Wallet', 'Vitals', 'Wellness', 'DietLog', 'Admin', 'Emergency', 'Scans', 'DoctorCare', 'HealthSharing'],
  endpoints: (builder) => ({
    register: builder.mutation<ApiResponse<AuthSessionData>, Record<string, unknown>>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    logout: builder.mutation<ApiResponse<unknown>, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    unlockAccount: builder.mutation<ApiResponse<{ message: string }>, { token: string }>({
      query: (body) => ({ url: '/auth/unlock-account', method: 'POST', body }),
    }),
    sendOtp: builder.mutation<
      ApiResponse<{ message: string; expiresInMinutes: number; otp?: string }>,
      { phone: string; purpose: 'login' | 'register' }
    >({
      query: (body) => ({ url: '/auth/send-otp', method: 'POST', body }),
    }),
    loginOtp: builder.mutation<ApiResponse<AuthSessionData>, { phone: string; otp: string }>({
      query: (body) => ({ url: '/auth/login-otp', method: 'POST', body }),
    }),
    demoLogin: builder.mutation<ApiResponse<AuthSessionData>, { phone?: string }>({
      query: (body) => ({ url: '/auth/demo-login', method: 'POST', body: body || {} }),
    }),
    getProfile: builder.query<ApiResponse<User>, void>({
      query: () => '/auth/profile',
      providesTags: ['User'],
    }),
    getDoctors: builder.query<
      ApiResponse<{ doctors: Doctor[]; pagination: { page: number; limit: number; total: number; pages: number } }>,
      Record<string, string | undefined>
    >({
      query: (params) => ({ url: '/doctors', params }),
      providesTags: ['Doctors'],
    }),
    getFeaturedDoctors: builder.query<ApiResponse<Doctor[]>, void>({
      query: () => '/doctors/featured',
      providesTags: ['Doctors'],
    }),
    getDoctorById: builder.query<ApiResponse<DoctorProfileResponse>, string>({
      query: (id) => `/doctors/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Doctors', id }],
    }),
    getDoctorAvailability: builder.query<
      ApiResponse<{ date: string; day: string; slots: { time: string; available: boolean }[] }>,
      { id: string; date?: string }
    >({
      query: ({ id, date }) => ({ url: `/doctors/${id}/availability`, params: date ? { date } : {} }),
    }),
    bookAppointment: builder.mutation<ApiResponse<Appointment>, Record<string, unknown>>({
      query: (body) => ({ url: '/appointments/book', method: 'POST', body }),
      invalidatesTags: ['Appointments'],
    }),
    uploadBookingReports: builder.mutation<
      ApiResponse<{ files: { fileName: string; fileUrl: string; fileType: string }[] }>,
      FormData
    >({
      query: (body) => ({ url: '/appointments/upload-reports', method: 'POST', body }),
    }),
    createAppointmentPaymentIntent: builder.mutation<
      ApiResponse<{ clientSecret: string; paymentIntentId: string; amount: number }>,
      string
    >({
      query: (id) => ({ url: `/appointments/${id}/payment-intent`, method: 'POST' }),
    }),
    confirmAppointmentPayment: builder.mutation<
      ApiResponse<Appointment>,
      { id: string; method: 'wallet' | 'card' | 'clinic'; paymentIntentId?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/appointments/${id}/pay`, method: 'POST', body }),
      invalidatesTags: ['Appointments', 'Wallet'],
    }),
    getAppointments: builder.query<ApiResponse<{ appointments: Appointment[]; pagination: unknown }>, { status?: string }>({
      query: (params) => ({ url: '/appointments', params }),
      providesTags: ['Appointments'],
    }),
    getAppointmentById: builder.query<ApiResponse<Appointment>, string>({
      query: (id) => `/appointments/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Appointments', id }],
    }),
    cancelAppointment: builder.mutation<ApiResponse<Appointment>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/appointments/${id}/cancel`, method: 'PUT', body: { reason } }),
      invalidatesTags: ['Appointments'],
    }),
    joinConsultation: builder.mutation<ApiResponse<{ roomId: string }>, string>({
      query: (id) => ({ url: `/appointments/${id}/join`, method: 'POST' }),
    }),
    completeAppointment: builder.mutation<ApiResponse<Appointment>, string>({
      query: (id) => ({ url: `/appointments/${id}/complete`, method: 'POST' }),
      invalidatesTags: ['Appointments'],
    }),
    rateAppointment: builder.mutation<ApiResponse<Appointment>, { id: string; score: number; review?: string }>({
      query: ({ id, score, review }) => ({ url: `/appointments/${id}/rate`, method: 'POST', body: { score, review } }),
      invalidatesTags: ['Appointments', 'Doctors'],
    }),
    getMedicines: builder.query<ApiResponse<{ medicines: Medicine[]; pagination: unknown }>, Record<string, string | undefined>>({
      query: (params) => ({ url: '/pharmacy/medicines', params }),
      providesTags: ['Medicines'],
    }),
    getMedicineById: builder.query<ApiResponse<Medicine>, string>({
      query: (id) => `/pharmacy/medicines/${id}`,
    }),
    getPharmacyOrders: builder.query<ApiResponse<PharmacyOrder[]>, void>({
      query: () => '/pharmacy/orders',
      providesTags: ['Orders'],
    }),
    getPharmacyOrderById: builder.query<ApiResponse<PharmacyOrder>, string>({
      query: (id) => `/pharmacy/orders/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Orders', id }],
    }),
    createPharmacyOrder: builder.mutation<ApiResponse<PharmacyOrder>, Record<string, unknown>>({
      query: (body) => ({ url: '/pharmacy/orders', method: 'POST', body }),
      invalidatesTags: ['Orders', 'Wallet'],
    }),
    createPaymentIntent: builder.mutation<ApiResponse<{ clientSecret: string; paymentIntentId: string }>, { amount: number; metadata?: Record<string, string> }>({
      query: (body) => ({ url: '/payments/create-intent', method: 'POST', body }),
    }),
    verifyPayment: builder.mutation<ApiResponse<unknown>, { paymentIntentId: string; type: string; referenceId: string }>({
      query: (body) => ({ url: '/payments/verify', method: 'POST', body }),
    }),
    requestAmbulance: builder.mutation<ApiResponse<unknown>, Record<string, unknown>>({
      query: (body) => ({ url: '/ambulance/request', method: 'POST', body }),
      invalidatesTags: ['Ambulance'],
    }),
    getEmergencyHistory: builder.query<ApiResponse<unknown[]>, void>({
      query: () => '/ambulance/history',
      providesTags: ['Emergency'],
    }),
    getEmergencyRecord: builder.query<ApiResponse<unknown>, string>({
      query: (id) => `/ambulance/history/${id}`,
      providesTags: ['Emergency'],
    }),
    getRapidCareHistory: builder.query<ApiResponse<unknown[]>, string>({
      query: (patientId) => `/rapidcare/history/${patientId}`,
      providesTags: ['Emergency'],
    }),
    shareRapidCareReport: builder.mutation<ApiResponse<unknown>, string>({
      query: (bookingId) => ({ url: `/rapidcare/${bookingId}/share`, method: 'PATCH' }),
      invalidatesTags: ['Emergency'],
    }),
    createRapidCarePrefillToken: builder.mutation<ApiResponse<{ token: string }>, void>({
      query: () => ({ url: '/auth/rapidcare-token', method: 'POST' }),
    }),
    requestEmergencySos: builder.mutation<ApiResponse<TransportSosResponse>, Record<string, unknown>>({
      query: (body) => ({ url: '/transport/sos', method: 'POST', body }),
    }),
    requestTransport: builder.mutation<ApiResponse<TransportSosResponse>, Record<string, unknown>>({
      query: (body) => ({ url: '/transport/request', method: 'POST', body }),
    }),
    getTransportTrack: builder.query<ApiResponse<TransportTrackData>, string>({
      query: (id) => `/transport/${id}/track`,
    }),
    getTransportByToken: builder.query<ApiResponse<TransportTrackData>, string>({
      query: (token) => `/transport/track/${token}`,
    }),
    getTransportById: builder.query<ApiResponse<unknown>, string>({
      query: (id) => `/transport/${id}`,
    }),
    acceptTransport: builder.mutation<ApiResponse<unknown>, string>({
      query: (id) => ({ url: `/transport/${id}/accept`, method: 'PUT' }),
    }),
    updateTransportStatus: builder.mutation<ApiResponse<unknown>, { id: string; status: string; location?: { lat: number; lng: number } }>({
      query: ({ id, ...body }) => ({ url: `/transport/${id}/status`, method: 'PUT', body }),
    }),
    verifyTransportOtp: builder.mutation<ApiResponse<unknown>, { id: string; otp: string }>({
      query: ({ id, otp }) => ({ url: `/transport/${id}/verify-otp`, method: 'POST', body: { otp } }),
    }),
    getDriverTransportRequests: builder.query<ApiResponse<unknown[]>, void>({
      query: () => '/transport/driver/requests',
    }),
    cancelTransport: builder.mutation<ApiResponse<unknown>, string>({
      query: (id) => ({ url: `/transport/${id}/cancel`, method: 'PUT' }),
    }),
    regenerateTrackingLink: builder.mutation<ApiResponse<{ trackingToken: string; trackingUrl: string }>, string>({
      query: (id) => ({ url: `/transport/${id}/tracking-link`, method: 'POST' }),
    }),
    triggerSOS: builder.mutation<
      ApiResponse<EmergencySosDispatchData>,
      { patientLat: number; patientLng: number; emergencyType: EmergencyType; patientId: string }
    >({
      query: (body) => ({ url: '/emergency/sos', method: 'POST', body }),
      invalidatesTags: ['Emergency'],
    }),
    getEmergencyNearbyHospitals: builder.query<
      ApiResponse<NearbyHospitalsResponse>,
      { lat: number; lng: number; radius?: number }
    >({
      query: ({ lat, lng, radius = 25 }) => ({
        url: '/emergency/nearby-hospitals',
        params: { lat, lng, radius },
      }),
    }),
    getLiveETA: builder.query<ApiResponse<EmergencyLiveEtaData>, string>({
      query: (id) => `/emergency/requests/${id}/eta`,
      providesTags: (_r, _e, id) => [{ type: 'Emergency', id }],
    }),
    cancelEmergency: builder.mutation<
      ApiResponse<{ requestId: string; status: string }>,
      string
    >({
      query: (id) => ({ url: `/emergency/requests/${id}/cancel`, method: 'PUT' }),
      invalidatesTags: ['Emergency'],
    }),
    getDriverEmergencyActive: builder.query<
      ApiResponse<{
        unit: { id: string; vehicleNumber: string; status: string } | null;
        request: {
          requestId: string;
          status: string;
          pickupOtp?: string;
          patientLocation: { lat: number; lng: number };
        } | null;
      }>,
      void
    >({
      query: () => '/emergency/driver/active-request',
      providesTags: ['Emergency'],
    }),
    verifyEmergencyOtp: builder.mutation<ApiResponse<unknown>, { id: string; otp: string }>({
      query: ({ id, otp }) => ({
        url: `/emergency/requests/${id}/verify-otp`,
        method: 'POST',
        body: { otp },
      }),
      invalidatesTags: ['Emergency'],
    }),
    markDriverArrived: builder.mutation<
      ApiResponse<{ requestId: string; status: string; message: string }>,
      string
    >({
      query: (id) => ({
        url: `/emergency/requests/${id}/arrived`,
        method: 'POST',
      }),
      invalidatesTags: ['Emergency'],
    }),
    getPlatformStats: builder.query<ApiResponse<{ activeDoctors: number; completedAppointments: number; happyPatients: number; livesSaved: number }>, void>({
      query: () => '/admin/stats',
    }),
    getSpecialties: builder.query<ApiResponse<string[]>, void>({
      query: () => '/admin/specialties',
    }),
    searchCities: builder.query<ApiResponse<import('@/types').CitySearchResult[]>, { q?: string; limit?: string }>({
      query: (params) => ({ url: '/utils/cities', params }),
    }),
    getCityDetails: builder.query<
      ApiResponse<{ city: string; state: string; doctorCount: number; hospitalCount: number; topHospitals: import('@/types').Hospital[] }>,
      string
    >({
      query: (city) => `/utils/cities/${encodeURIComponent(city)}`,
    }),
    getHospitals: builder.query<
      ApiResponse<{ hospitals: import('@/types').Hospital[]; pagination: { page: number; limit: number; total: number; pages: number } }>,
      Record<string, string | undefined>
    >({
      query: (params) => ({ url: '/hospitals', params }),
    }),
    getHospitalById: builder.query<ApiResponse<import('@/types').Hospital>, string>({
      query: (id) => `/hospitals/${id}`,
    }),
    getNearbyGoogleHospitals: builder.query<
      ApiResponse<{
        count: number;
        radiusKm: number;
        source: string;
        hospitals: GoogleHospitalPlace[];
      }>,
      {
        lat: number;
        lng: number;
        radius?: number;
        type?: 'all' | 'hospital' | 'clinic' | 'pharmacy' | 'diagnostic';
        sort?: 'distance' | 'rating' | 'open';
        openNow?: boolean;
      }
    >({
      query: ({ lat, lng, radius = 5, type, sort, openNow }) => ({
        url: '/hospitals/nearby',
        params: {
          lat,
          lng,
          radius,
          ...(type ? { type } : {}),
          ...(sort ? { sort } : {}),
          ...(openNow ? { openNow: 'true' } : {}),
        },
      }),
      providesTags: ['Emergency'],
    }),
    getHospitalRoutePreview: builder.query<
      ApiResponse<HospitalRoutePreviewData>,
      { originLat: number; originLng: number; destLat: number; destLng: number }
    >({
      query: (params) => ({ url: '/hospitals/route-preview', params }),
    }),
    getGooglePlaceDetails: builder.query<ApiResponse<GoogleHospitalPlace>, string>({
      query: (placeId) => `/hospitals/${placeId}`,
    }),
    recommendSmartHospital: builder.query<
      ApiResponse<SmartHospitalRecommendation>,
      { patientId?: string; lat: number; lng: number; radius?: number }
    >({
      query: ({ patientId, ...params }) => ({
        url: '/hospitals/recommend',
        params: { ...params, ...(patientId ? { patientId } : {}) },
      }),
    }),
    getNavigationRoute: builder.mutation<
      ApiResponse<NavigationRouteData>,
      {
        originLat: number;
        originLng: number;
        destLat: number;
        destLng: number;
        mode?: 'driving' | 'walking' | 'ambulance';
      }
    >({
      query: (body) => ({ url: '/navigation/route', method: 'POST', body }),
    }),
    getNavigationEta: builder.query<ApiResponse<NavigationEtaData>, string>({
      query: (requestId) => ({
        url: '/navigation/eta',
        params: { requestId },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Emergency', id: `nav-${id}` }],
    }),
    // Phase 2: Prescriptions
    getPrescriptions: builder.query<ApiResponse<Prescription[]>, void>({
      query: () => '/prescriptions',
      providesTags: ['Prescriptions'],
    }),
    getPrescriptionById: builder.query<ApiResponse<Prescription>, string>({
      query: (id) => `/prescriptions/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Prescriptions', id }],
    }),
    createPrescription: builder.mutation<ApiResponse<Prescription>, Record<string, unknown>>({
      query: (body) => ({ url: '/prescriptions', method: 'POST', body }),
      invalidatesTags: ['Prescriptions'],
    }),
    getMedicationReminders: builder.query<
      ApiResponse<
        Array<{
          _id: string;
          medicineName: string;
          dosage: string;
          times: string[];
          isActive: boolean;
          beforeAfterFood?: string;
        }>
      >,
      void
    >({
      query: () => '/reminders',
      providesTags: ['Prescriptions'],
    }),
    enablePrescriptionReminders: builder.mutation<ApiResponse<unknown>, string>({
      query: (prescriptionId) => ({
        url: `/reminders/from-prescription/${prescriptionId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Prescriptions'],
    }),
    getMyDoctorAvailability: builder.query<
      ApiResponse<Array<{ day: string; slots: Array<{ startTime: string; endTime: string }> }>>,
      void
    >({
      query: () => '/doctors/me/availability',
    }),
    updateMyDoctorAvailability: builder.mutation<
      ApiResponse<unknown>,
      { availability: Array<{ day: string; slots: Array<{ startTime: string; endTime: string }> }> }
    >({
      query: (body) => ({ url: '/doctors/me/availability', method: 'PATCH', body }),
    }),
    // Phase 2: Health Records
    getHealthRecords: builder.query<ApiResponse<HealthRecord[]>, { recordType?: string; search?: string }>({
      query: (params) => ({ url: '/health-records', params }),
      providesTags: ['HealthRecords'],
    }),
    uploadHealthRecord: builder.mutation<ApiResponse<HealthRecord>, FormData>({
      query: (body) => ({ url: '/health-records', method: 'POST', body }),
      invalidatesTags: ['HealthRecords'],
    }),
    deleteHealthRecord: builder.mutation<ApiResponse<unknown>, string>({
      query: (id) => ({ url: `/health-records/${id}`, method: 'DELETE' }),
      invalidatesTags: ['HealthRecords'],
    }),
    // Phase 2: Notifications
    getNotifications: builder.query<
      ApiResponse<Notification[]> & { meta?: { unreadCount: number } },
      { type?: string; limit?: string } | void
    >({
      query: (params) => ({ url: '/notifications', params: params || {} }),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<ApiResponse<unknown>, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PUT' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<ApiResponse<unknown>, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PUT' }),
      invalidatesTags: ['Notifications'],
    }),
    // Phase 2: Wallet
    getWallet: builder.query<
      ApiResponse<{
        balance: number;
        transactions: import('@/types').WalletTransaction[];
        monthlySummary: import('@/types').WalletMonthlySummary;
        stripeEnabled: boolean;
      }>,
      void
    >({
      query: () => '/users/wallet',
      providesTags: ['Wallet'],
    }),
    createWalletTopUpIntent: builder.mutation<
      ApiResponse<{ clientSecret: string; paymentIntentId: string; amount: number }>,
      { amount: number }
    >({
      query: (body) => ({ url: '/users/wallet/topup-intent', method: 'POST', body }),
    }),
    confirmWalletTopUp: builder.mutation<
      ApiResponse<{ balance: number; alreadyProcessed?: boolean }>,
      { paymentIntentId: string }
    >({
      query: (body) => ({ url: '/users/wallet/confirm-topup', method: 'POST', body }),
      invalidatesTags: ['Wallet'],
    }),
    addWalletMoney: builder.mutation<ApiResponse<{ balance: number }>, { amount: number }>({
      query: (body) => ({ url: '/users/wallet/add-money', method: 'POST', body }),
      invalidatesTags: ['Wallet'],
    }),
    getWalletTransactions: builder.query<
      ApiResponse<{
        transactions: import('@/types').WalletTransaction[];
        monthlySummary: import('@/types').WalletMonthlySummary;
        pagination: { page: number; limit: number; total: number; pages: number };
      }>,
      { page?: string }
    >({
      query: (params) => ({ url: '/users/wallet/transactions', params }),
      providesTags: ['Wallet'],
    }),
    requestWalletRefund: builder.mutation<ApiResponse<unknown>, string>({
      query: (transactionId) => ({
        url: `/users/wallet/transactions/${transactionId}/refund`,
        method: 'POST',
      }),
      invalidatesTags: ['Wallet'],
    }),
    getMedicalHistory: builder.query<ApiResponse<User['medicalHistory']>, void>({
      query: () => '/users/medical-history',
      providesTags: ['User'],
    }),
    updateMedicalHistory: builder.mutation<ApiResponse<User>, Record<string, unknown>>({
      query: (body) => ({ url: '/users/medical-history', method: 'PUT', body }),
      invalidatesTags: ['User', 'Wellness'],
    }),
    getVitals: builder.query<ApiResponse<VitalsSummary>, { type?: string; days?: string } | void>({
      query: (params) => ({ url: '/users/vitals', params: params || {} }),
      providesTags: ['Vitals'],
    }),
    getPatientVitalsForDoctor: builder.query<
      ApiResponse<VitalsSummary & { patientId: string }>,
      { patientId: string; days?: string }
    >({
      query: ({ patientId, days = '30' }) => ({
        url: `/doctors/patients/${patientId}/vitals`,
        params: { days },
      }),
      providesTags: ['Vitals'],
    }),
    logVital: builder.mutation<ApiResponse<VitalReading>, Record<string, unknown>>({
      query: (body) => ({ url: '/users/vitals', method: 'POST', body }),
      invalidatesTags: ['Vitals', 'Wellness'],
    }),
    getWellnessPlan: builder.query<ApiResponse<WellnessPlan>, void>({
      query: () => '/users/wellness-plan',
      providesTags: ['Wellness'],
    }),
    logDietEntry: builder.mutation<
      ApiResponse<DietLogEntry>,
      {
        mealSlot: MealSlot;
        status: DietAdherenceStatus;
        actualFood?: string;
        offPlanDescription?: string;
        offPlanCategory?: OffPlanCategory;
      }
    >({
      query: (body) => ({ url: '/users/diet-log', method: 'POST', body }),
      invalidatesTags: ['Wellness', 'DietLog'],
    }),
    getTodayDietLog: builder.query<ApiResponse<DietLogEntry[]>, void>({
      query: () => '/users/diet-log/today',
      providesTags: ['DietLog'],
    }),
    deleteVital: builder.mutation<ApiResponse<unknown>, string>({
      query: (id) => ({ url: `/users/vitals/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Vitals'],
    }),
    // Phase 2: Admin
    getAdminDashboard: builder.query<ApiResponse<AdminDashboard>, void>({
      query: () => '/admin/dashboard',
      providesTags: ['Admin'],
    }),
    getAdminUsers: builder.query<ApiResponse<{ users: User[]; pagination: unknown }>, { userType?: string; page?: string }>({
      query: (params) => ({ url: '/admin/users', params }),
      providesTags: ['Admin'],
    }),
    verifyUser: builder.mutation<ApiResponse<User>, string>({
      query: (id) => ({ url: `/admin/users/${id}/verify`, method: 'PUT' }),
      invalidatesTags: ['Admin'],
    }),
    blockUser: builder.mutation<ApiResponse<User>, { id: string; isBlocked: boolean }>({
      query: ({ id, isBlocked }) => ({ url: `/admin/users/${id}/block`, method: 'PUT', body: { isBlocked } }),
      invalidatesTags: ['Admin'],
    }),
    getRevenueReport: builder.query<ApiResponse<RevenueReport>, void>({
      query: () => '/admin/reports/revenue',
      providesTags: ['Admin'],
    }),
    getAdminHealth: builder.query<ApiResponse<PlatformHealth>, void>({
      query: () => '/admin/health',
      providesTags: ['Admin'],
    }),
    getPendingDoctorVerifications: builder.query<ApiResponse<User[]>, void>({
      query: () => '/admin/doctors/pending-verification',
      providesTags: ['Admin'],
    }),
    approveDoctorVerification: builder.mutation<ApiResponse<User>, string>({
      query: (id) => ({ url: `/admin/doctors/${id}/approve`, method: 'PUT' }),
      invalidatesTags: ['Admin', 'Doctors'],
    }),
    rejectDoctorVerification: builder.mutation<ApiResponse<User>, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/admin/doctors/${id}/reject`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: ['Admin', 'Doctors'],
    }),
    getPendingReviews: builder.query<ApiResponse<Review[]>, void>({
      query: () => '/admin/reviews/pending',
      providesTags: ['Admin'],
    }),
    moderateReview: builder.mutation<ApiResponse<Review>, { id: string; status: 'approved' | 'rejected' }>({
      query: ({ id, status }) => ({
        url: `/admin/reviews/${id}/moderate`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Admin', 'Doctors'],
    }),
    getDoctorVerificationStatus: builder.query<
      ApiResponse<{
        verificationStatus: string;
        verified: boolean;
        rejectionReason?: string;
        verificationDocuments?: User['doctorDetails'] extends infer D
          ? D extends { verificationDocuments?: infer V }
            ? V
            : never
          : never;
      }>,
      void
    >({
      query: () => '/doctors/verification/status',
      providesTags: ['User'],
    }),
    submitDoctorVerification: builder.mutation<ApiResponse<unknown>, FormData>({
      query: (body) => ({
        url: '/doctors/verification/documents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User', 'Admin'],
    }),
    analyzeChestScan: builder.mutation<ApiResponse<ChestScan>, FormData>({
      query: (body) => ({ url: '/scans/analyze', method: 'POST', body }),
      invalidatesTags: ['Scans', 'HealthRecords'],
    }),
    getMyChestScans: builder.query<ApiResponse<ChestScan[]>, void>({
      query: () => '/scans/my-scans',
      providesTags: ['Scans'],
    }),
    getUnifiedScanHistory: builder.query<
      ApiResponse<import('@/types/scanHistory').UnifiedScanHistoryItem[]>,
      void
    >({
      query: () => '/scans/history',
      providesTags: ['Scans'],
    }),
    getDoctorPatientScans: builder.query<ApiResponse<ChestScan[]>, void>({
      query: () => '/scans/doctor/patient-scans',
      providesTags: ['Scans'],
    }),
    getPatientChestScansForDoctor: builder.query<ApiResponse<ChestScan[]>, string>({
      query: (patientId) => `/scans/patient/${patientId}`,
      providesTags: ['Scans'],
    }),
    addChestScanNote: builder.mutation<
      ApiResponse<ChestScan>,
      { id: string; doctorNote: string }
    >({
      query: ({ id, doctorNote }) => ({
        url: `/scans/chest/${id}/note`,
        method: 'PATCH',
        body: { doctorNote },
      }),
      invalidatesTags: ['Scans'],
    }),
    uploadScan: builder.mutation<
      ApiResponse<ScanReport & { analysisStatus?: string }>,
      FormData
    >({
      query: (body) => ({ url: '/scans/upload', method: 'POST', body }),
      invalidatesTags: ['Scans', 'Wellness', 'HealthRecords'],
    }),
    getMyScanReports: builder.query<ApiResponse<ScanReport[]>, void>({
      query: () => '/scans/my-reports',
      providesTags: ['Scans'],
    }),
    getScanReportById: builder.query<ApiResponse<ScanReport>, string>({
      query: (id) => `/scans/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Scans', id }],
    }),
    shareScanWithDoctor: builder.mutation<
      ApiResponse<ScanReport | ChestScan>,
      { id: string; doctorId?: string }
    >({
      query: ({ id, doctorId }) => ({
        url: `/scans/${id}/share`,
        method: 'PATCH',
        body: doctorId ? { doctorId } : {},
      }),
      invalidatesTags: ['Scans'],
    }),
    getDoctorScans: builder.query<
      ApiResponse<ScanReport[]>,
      { status?: string; scanType?: string } | void
    >({
      query: (params) => ({
        url: '/scans/doctor/scans',
        params: params ?? {},
      }),
      providesTags: ['Scans'],
    }),
    getDoctorPendingScans: builder.query<ApiResponse<ScanReport[]>, void>({
      query: () => '/scans/doctor/pending',
      providesTags: ['Scans'],
    }),
    getDoctorScanAnalytics: builder.query<ApiResponse<DoctorScanAnalytics>, void>({
      query: () => '/scans/doctor/analytics',
      providesTags: ['Scans'],
    }),
    reviewDoctorScan: builder.mutation<ApiResponse<ScanReport>, { id: string } & ScanReviewPayload>({
      query: ({ id, ...body }) => ({
        url: `/scans/${id}/review`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Scans'],
    }),
    getDoctorCarePatients: builder.query<
      ApiResponse<{ patients: DoctorPatientListItem[]; count: number }>,
      { search?: string } | void
    >({
      query: (params) => ({
        url: '/doctors/care/patients',
        params: params?.search ? { search: params.search } : {},
      }),
      providesTags: ['DoctorCare'],
    }),
    getDoctorCarePatientDetail: builder.query<ApiResponse<DoctorPatientDetail>, string>({
      query: (patientId) => `/doctors/care/patients/${patientId}`,
      providesTags: (_r, _e, patientId) => [{ type: 'DoctorCare', id: patientId }],
    }),
    publishDoctorCarePlan: builder.mutation<
      ApiResponse<DoctorCarePlan>,
      {
        patientId: string;
        title?: string;
        summary?: string;
        dos?: string[];
        donts?: string[];
        dietInstructions?: string;
        lifestyleNotes?: string;
        bpSugarNotes?: string;
        publishToPatient?: boolean;
        appointmentId?: string;
      }
    >({
      query: ({ patientId, ...body }) => ({
        url: `/doctors/care/patients/${patientId}/care-plans`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DoctorCare'],
    }),
    getHealthSharing: builder.query<ApiResponse<HealthDataSharing>, void>({
      query: () => '/users/health-sharing',
      providesTags: ['HealthSharing'],
    }),
    updateHealthSharing: builder.mutation<
      ApiResponse<HealthDataSharing>,
      Partial<Pick<HealthDataSharing, 'shareVitalsWithDoctors' | 'shareWellnessWithDoctors'>>
    >({
      query: (body) => ({ url: '/users/health-sharing', method: 'PATCH', body }),
      invalidatesTags: ['HealthSharing'],
    }),
    getMyDoctorCarePlans: builder.query<ApiResponse<DoctorCarePlan[]>, void>({
      query: () => '/users/care-plans',
      providesTags: ['DoctorCare'],
    }),
    getPharmacyStaffOrders: builder.query<ApiResponse<import('@/types').PharmacyOrder[]>, void>({
      query: () => '/pharmacy/staff/orders',
      providesTags: ['Orders'],
    }),
    updatePharmacyStaffOrderStatus: builder.mutation<
      ApiResponse<import('@/types').PharmacyOrder>,
      { id: string; status: string }
    >({
      query: ({ id, status }) => ({
        url: `/pharmacy/staff/orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Orders'],
    }),
    getPharmacyStaffInventory: builder.query<ApiResponse<Medicine[]>, void>({
      query: () => '/pharmacy/staff/inventory',
      providesTags: ['Medicines'],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLogoutMutation,
  useUnlockAccountMutation,
  useSendOtpMutation,
  useLoginOtpMutation,
  useDemoLoginMutation,
  useGetProfileQuery,
  useGetDoctorsQuery,
  useGetFeaturedDoctorsQuery,
  useGetDoctorByIdQuery,
  useGetDoctorAvailabilityQuery,
  useBookAppointmentMutation,
  useUploadBookingReportsMutation,
  useCreateAppointmentPaymentIntentMutation,
  useConfirmAppointmentPaymentMutation,
  useGetAppointmentsQuery,
  useGetAppointmentByIdQuery,
  useCancelAppointmentMutation,
  useJoinConsultationMutation,
  useCompleteAppointmentMutation,
  useRateAppointmentMutation,
  useGetMedicinesQuery,
  useGetMedicineByIdQuery,
  useGetPharmacyOrdersQuery,
  useGetPharmacyOrderByIdQuery,
  useCreatePharmacyOrderMutation,
  useCreatePaymentIntentMutation,
  useVerifyPaymentMutation,
  useRequestAmbulanceMutation,
  useGetEmergencyHistoryQuery,
  useGetEmergencyRecordQuery,
  useGetRapidCareHistoryQuery,
  useShareRapidCareReportMutation,
  useCreateRapidCarePrefillTokenMutation,
  useRequestEmergencySosMutation,
  useRequestTransportMutation,
  useGetTransportTrackQuery,
  useLazyGetTransportTrackQuery,
  useGetTransportByTokenQuery,
  useLazyGetTransportByTokenQuery,
  useGetTransportByIdQuery,
  useAcceptTransportMutation,
  useUpdateTransportStatusMutation,
  useVerifyTransportOtpMutation,
  useGetDriverTransportRequestsQuery,
  useCancelTransportMutation,
  useRegenerateTrackingLinkMutation,
  useTriggerSOSMutation,
  useGetEmergencyNearbyHospitalsQuery,
  useLazyGetEmergencyNearbyHospitalsQuery,
  useGetLiveETAQuery,
  useCancelEmergencyMutation,
  useGetDriverEmergencyActiveQuery,
  useVerifyEmergencyOtpMutation,
  useMarkDriverArrivedMutation,
  useGetPlatformStatsQuery,
  useGetSpecialtiesQuery,
  useSearchCitiesQuery,
  useLazySearchCitiesQuery,
  useGetCityDetailsQuery,
  useGetHospitalsQuery,
  useGetHospitalByIdQuery,
  useGetNearbyGoogleHospitalsQuery,
  useGetHospitalRoutePreviewQuery,
  useGetGooglePlaceDetailsQuery,
  useRecommendSmartHospitalQuery,
  useGetNavigationRouteMutation,
  useGetNavigationEtaQuery,
  useGetPrescriptionsQuery,
  useGetPrescriptionByIdQuery,
  useCreatePrescriptionMutation,
  useGetMedicationRemindersQuery,
  useEnablePrescriptionRemindersMutation,
  useGetMyDoctorAvailabilityQuery,
  useUpdateMyDoctorAvailabilityMutation,
  useGetHealthRecordsQuery,
  useUploadHealthRecordMutation,
  useDeleteHealthRecordMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetWalletQuery,
  useCreateWalletTopUpIntentMutation,
  useConfirmWalletTopUpMutation,
  useAddWalletMoneyMutation,
  useGetWalletTransactionsQuery,
  useRequestWalletRefundMutation,
  useGetMedicalHistoryQuery,
  useUpdateMedicalHistoryMutation,
  useGetVitalsQuery,
  useGetPatientVitalsForDoctorQuery,
  useLogVitalMutation,
  useDeleteVitalMutation,
  useGetWellnessPlanQuery,
  useLogDietEntryMutation,
  useGetTodayDietLogQuery,
  useGetAdminDashboardQuery,
  useGetAdminUsersQuery,
  useVerifyUserMutation,
  useBlockUserMutation,
  useGetRevenueReportQuery,
  useGetAdminHealthQuery,
  useGetPendingDoctorVerificationsQuery,
  useApproveDoctorVerificationMutation,
  useRejectDoctorVerificationMutation,
  useGetPendingReviewsQuery,
  useModerateReviewMutation,
  useGetDoctorVerificationStatusQuery,
  useSubmitDoctorVerificationMutation,
  useAnalyzeChestScanMutation,
  useGetMyChestScansQuery,
  useGetUnifiedScanHistoryQuery,
  useGetDoctorPatientScansQuery,
  useGetPatientChestScansForDoctorQuery,
  useAddChestScanNoteMutation,
  useUploadScanMutation,
  useGetMyScanReportsQuery,
  useGetScanReportByIdQuery,
  useShareScanWithDoctorMutation,
  useGetDoctorScansQuery,
  useGetDoctorPendingScansQuery,
  useGetDoctorScanAnalyticsQuery,
  useReviewDoctorScanMutation,
  useGetDoctorCarePatientsQuery,
  useGetDoctorCarePatientDetailQuery,
  usePublishDoctorCarePlanMutation,
  useGetHealthSharingQuery,
  useUpdateHealthSharingMutation,
  useGetMyDoctorCarePlansQuery,
  useGetPharmacyStaffOrdersQuery,
  useUpdatePharmacyStaffOrderStatusMutation,
  useGetPharmacyStaffInventoryQuery,
} = api;
