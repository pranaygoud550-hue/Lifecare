export type ServiceType = 'emergency' | 'scheduled' | 'diagnostic';
export type VehicleType = 'BLS' | 'ALS' | 'PTV' | 'MORTUARY';
export type BookingStatus =
  | 'pending'
  | 'searching'
  | 'accepted'
  | 'en-route'
  | 'arrived'
  | 'in-transit'
  | 'completed'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'pay_on_arrival' | 'refunded';

export interface Coords {
  lat: number;
  lng: number;
}

export interface LocationInfo {
  address: string;
  coords: Coords;
  placeId?: string;
}

export interface BookingPayload {
  serviceType: ServiceType;
  patientName: string;
  age: number;
  phone: string;
  emergencyContact: string;
  condition: string;
  isConscious: boolean;
  allergies?: string;
  pickup: LocationInfo;
  destination: LocationInfo;
  nearestHospital?: boolean;
  vehicleType: VehicleType;
  paymentMethod: 'stripe' | 'pay_on_arrival';
  lifecarePatientId?: string;
  lifecareToken?: string;
}

export interface LifecareSyncPayload {
  rapidcareBookingId: string;
  patientName: string;
  patientPhone: string;
  lifecarePatientId?: string;
  pickupLocation: string;
  hospital: string;
  vehicleType: VehicleType;
  condition: string;
  dispatchTime: string;
  arrivalTime: string;
  responseTimeMinutes: number;
  driverName: string;
  vehicleNumber: string;
  fare: number;
  paymentStatus: string;
}

export interface LiveStats {
  ambulancesAvailable: number;
  averageResponseMinutes: number;
  bookingsToday: number;
}
