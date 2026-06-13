import type { User } from '@/types';

export interface HealthDataSharing {
  shareVitalsWithDoctors: boolean;
  shareWellnessWithDoctors: boolean;
  updatedAt?: string;
}

export interface DoctorCarePlan {
  _id: string;
  doctorId: string | User;
  patientId: string;
  appointmentId?: string;
  title: string;
  summary: string;
  dos: string[];
  donts: string[];
  dietInstructions: string;
  lifestyleNotes?: string;
  bpSugarNotes?: string;
  publishedToPatient: boolean;
  patientAcknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorPatientListItem {
  _id: string;
  profile: User['profile'];
  email?: string;
  phone?: string;
  medicalHistory?: User['medicalHistory'];
  healthDataSharing?: HealthDataSharing;
  lastVisit?: string;
  appointmentCount?: number;
}

export interface DoctorPatientDetail {
  patient: User;
  carePlans: DoctorCarePlan[];
  upcomingAppointment?: {
    _id: string;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
    consultationType?: string;
  } | null;
}
