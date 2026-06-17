export type BloodAlertStatus = 'active' | 'fulfilled' | 'cancelled' | 'expired';
export type BloodAlertUrgency = 'critical' | 'urgent' | 'normal';
export type BloodDonorResponseStatus = 'on_my_way' | 'cannot_donate';

export interface BloodDonorResponse {
  userId: {
    _id: string;
    profile?: { firstName?: string; lastName?: string };
    phone?: string;
    medicalHistory?: { bloodGroup?: string };
  };
  status: BloodDonorResponseStatus;
  respondedAt: string;
}

export interface BloodEmergencyAlert {
  _id: string;
  hospitalId: string;
  hospitalName: string;
  address: string;
  coordinates: { lat: number; lng: number };
  bloodGroup: string;
  unitsNeeded?: number;
  urgency: BloodAlertUrgency;
  notes?: string;
  createdBy: string;
  status: BloodAlertStatus;
  notifiedCount: number;
  responses: BloodDonorResponse[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalAdminAccount {
  _id: string;
  email: string;
  phone: string;
  profile: { firstName: string; lastName: string };
  hospitalAdminDetails?: {
    hospitalId: {
      _id: string;
      name: string;
      city?: string;
      address?: string;
    };
    designation?: string;
    verified?: boolean;
  };
  createdAt?: string;
  isActive?: boolean;
}

export interface HospitalAdminProfile {
  _id: string;
  email: string;
  phone: string;
  profile: { firstName: string; lastName: string };
  hospitalAdminDetails?: {
    hospitalId: {
      _id: string;
      name: string;
      address: string;
      city: string;
      coordinates: { lat: number; lng: number };
    };
    designation?: string;
    verified?: boolean;
    bloodBankLicenseNumber?: string;
    hospitalAuthorizationId?: string;
    legalAcknowledgedAt?: string;
    legalAcknowledgedBy?: string;
    legalTermsVersion?: string;
  };
  legalComplete?: boolean;
  legalTermsVersion?: string;
  legalSummary?: string[];
  legalFullText?: string;
}
