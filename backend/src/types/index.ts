export type UserType = 'patient' | 'doctor' | 'pharmacy' | 'ambulance' | 'admin' | 'hospital_admin';

export type AmbulanceUnitStatus = 'idle' | 'dispatched' | 'returning';

export type EmergencyRequestStatus =
  | 'searching'
  | 'dispatched'
  | 'arrived'
  | 'pickedUp'
  | 'atHospital'
  | 'completed'
  | 'cancelled';

export type EmergencyType = 'cardiac' | 'accident' | 'breathing' | 'other';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface JwtPayload {
  userId: string;
  userType: UserType;
  email: string;
  jti?: string;
  familyId?: string;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
