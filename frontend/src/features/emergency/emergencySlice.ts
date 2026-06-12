import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { EmergencyHospitalInfo, EmergencyRequestStatus, EmergencySosDispatchData } from '@/types';
import type { TriageAnswers, TriageRoute } from './triage';

export type HelpType = 'emergency' | 'hospital_ride' | 'teleconsult';

export type EmergencyStep =
  | 'closed'
  | 'choose'
  | 'guest'
  | 'emergency-dispatch'
  | 'hospital-ride'
  | 'triage'
  | 'sos'
  | 'escort'
  | 'teleconsult'
  | 'help-coming';

export interface GuestContact {
  name: string;
  phone: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface HospitalMapLocation extends MapCoordinate {
  name: string;
}

export interface SetEmergencyActivePayload {
  requestId: string;
  status?: EmergencyRequestStatus;
  patientLocation: MapCoordinate;
  ambulanceLocation?: MapCoordinate | null;
  hospitalLocation?: HospitalMapLocation | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
  driverPhone?: string | null;
  eta?: number | null;
  isDelayed?: boolean;
  dispatch?: EmergencySosDispatchData;
}

interface EmergencyState {
  isOpen: boolean;
  step: EmergencyStep;
  helpType: HelpType | null;
  nearestHospital: EmergencyHospitalInfo | null;
  nearbyHospitals: EmergencyHospitalInfo[];
  guest: GuestContact | null;
  triage: TriageAnswers;
  triageQuestionIndex: number;
  route: TriageRoute | null;
  location: GeoLocation | null;
  activeBookingId: string | null;
  trackingToken: string | null;
  requestId: string | null;
  status: EmergencyRequestStatus;
  ambulanceLocation: MapCoordinate | null;
  patientLocation: MapCoordinate | null;
  hospitalLocation: HospitalMapLocation | null;
  driverName: string | null;
  vehicleNumber: string | null;
  driverPhone: string | null;
  eta: number | null;
  isActive: boolean;
  isDelayed: boolean;
  hasArrivedAlert: boolean;
  pickupOtp: string | null;
  dispatchSnapshot: EmergencySosDispatchData | null;
  smartRecommendation: import('@/types').SmartHospitalRecommendation | null;
  navigationRoutePath: [number, number][] | null;
  nextNavInstruction: string | null;
}

const initialTriage: TriageAnswers = {
  lifeThreatening: null,
  canWalk: null,
  remoteDoctor: null,
};

const initialState: EmergencyState = {
  isOpen: false,
  step: 'closed',
  helpType: null,
  nearestHospital: null,
  nearbyHospitals: [],
  guest: null,
  triage: initialTriage,
  triageQuestionIndex: 0,
  route: null,
  location: null,
  activeBookingId: null,
  trackingToken: null,
  requestId: null,
  status: 'searching',
  ambulanceLocation: null,
  patientLocation: null,
  hospitalLocation: null,
  driverName: null,
  vehicleNumber: null,
  driverPhone: null,
  eta: null,
  isActive: false,
  isDelayed: false,
  hasArrivedAlert: false,
  pickupOtp: null,
  dispatchSnapshot: null,
  smartRecommendation: null,
  navigationRoutePath: null,
  nextNavInstruction: null,
};

function trackingFromDispatch(
  requestId: string,
  dispatch: EmergencySosDispatchData,
  patientLocation: MapCoordinate,
  status: EmergencyRequestStatus = 'dispatched'
): Partial<EmergencyState> {
  const ambulance = dispatch.assignedAmbulance;
  const hospital = dispatch.nearestHospital;

  return {
    requestId,
    status,
    isActive: true,
    isDelayed: dispatch.isDelayed,
    eta: dispatch.calculatedETA,
    patientLocation,
    ambulanceLocation: ambulance.currentLocation,
    hospitalLocation: hospital?.coordinates
      ? { lat: hospital.coordinates.lat, lng: hospital.coordinates.lng, name: hospital.name }
      : hospital
        ? { lat: patientLocation.lat, lng: patientLocation.lng, name: hospital.name }
        : null,
    driverName: ambulance.driver?.name ?? null,
    vehicleNumber: ambulance.vehicleNumber,
    driverPhone: ambulance.driver?.phone ?? null,
    dispatchSnapshot: dispatch,
    smartRecommendation: dispatch.smartRecommendation ?? null,
  };
}

const emergencySlice = createSlice({
  name: 'emergency',
  initialState,
  reducers: {
    openEmergency: (state) => {
      state.isOpen = true;
      state.step = 'choose';
      state.helpType = null;
      state.nearestHospital = null;
      state.nearbyHospitals = [];
      state.triage = initialTriage;
      state.triageQuestionIndex = 0;
      state.route = null;
    },
    setHelpType: (state, action: PayloadAction<HelpType>) => {
      state.helpType = action.payload;
    },
    setNearbyHospitals: (
      state,
      action: PayloadAction<{ hospitals: EmergencyHospitalInfo[]; nearest: EmergencyHospitalInfo | null }>
    ) => {
      state.nearbyHospitals = action.payload.hospitals;
      state.nearestHospital = action.payload.nearest;
    },
    proceedAfterHelpChoice: (state) => {
      if (!state.helpType) return;
      if (state.helpType === 'teleconsult') {
        state.step = 'teleconsult';
        return;
      }
      state.step = state.helpType === 'emergency' ? 'emergency-dispatch' : 'hospital-ride';
    },
    closeEmergency: () => {
      return { ...initialState };
    },
    setGuest: (state, action: PayloadAction<GuestContact | null>) => {
      state.guest = action.payload;
    },
    skipGuest: (state) => {
      if (state.helpType === 'emergency') {
        state.step = 'emergency-dispatch';
      } else if (state.helpType === 'hospital_ride') {
        state.step = 'hospital-ride';
      } else {
        state.step = 'triage';
      }
    },
    setTriageAnswer: (
      state,
      action: PayloadAction<{ key: keyof TriageAnswers; value: string }>
    ) => {
      const { key, value } = action.payload;
      if (key === 'lifeThreatening') state.triage.lifeThreatening = value as TriageAnswers['lifeThreatening'];
      else if (key === 'canWalk') state.triage.canWalk = value as TriageAnswers['canWalk'];
      else if (key === 'remoteDoctor') state.triage.remoteDoctor = value as TriageAnswers['remoteDoctor'];
      if (state.triageQuestionIndex < 2) {
        state.triageQuestionIndex += 1;
      }
    },
    setTriageRoute: (state, action: PayloadAction<TriageRoute>) => {
      state.route = action.payload;
      state.step =
        action.payload === 'sos'
          ? 'sos'
          : action.payload === 'escort'
            ? 'escort'
            : 'teleconsult';
    },
    setEmergencyStep: (state, action: PayloadAction<EmergencyStep>) => {
      state.step = action.payload;
    },
    setEmergencyLocation: (state, action: PayloadAction<GeoLocation>) => {
      state.location = action.payload;
    },
    setActiveBooking: (
      state,
      action: PayloadAction<{ bookingId: string; trackingToken?: string }>
    ) => {
      state.activeBookingId = action.payload.bookingId;
      state.trackingToken = action.payload.trackingToken || null;
      state.step = 'help-coming';
    },
    resetTriage: (state) => {
      state.triage = initialTriage;
      state.triageQuestionIndex = 0;
    },
    setEmergencyActive: (state, action: PayloadAction<SetEmergencyActivePayload>) => {
      const {
        requestId,
        status = 'dispatched',
        patientLocation,
        dispatch,
        ambulanceLocation,
        hospitalLocation,
        driverName,
        vehicleNumber,
        driverPhone,
        eta,
        isDelayed,
      } = action.payload;

      state.requestId = requestId;
      state.status = status;
      state.isActive = true;
      state.hasArrivedAlert = false;
      state.patientLocation = patientLocation;

      if (dispatch) {
        Object.assign(state, trackingFromDispatch(requestId, dispatch, patientLocation, status));
        return;
      }

      state.ambulanceLocation = ambulanceLocation ?? null;
      state.hospitalLocation = hospitalLocation ?? null;
      state.driverName = driverName ?? null;
      state.vehicleNumber = vehicleNumber ?? null;
      state.driverPhone = driverPhone ?? null;
      state.eta = eta ?? null;
      state.isDelayed = isDelayed ?? false;
    },
    updateAmbulanceLocation: (
      state,
      action: PayloadAction<{ lat: number; lng: number; eta?: number | null }>
    ) => {
      state.ambulanceLocation = { lat: action.payload.lat, lng: action.payload.lng };
      if (action.payload.eta != null) {
        state.eta = action.payload.eta;
      }
    },
    updateStatus: (state, action: PayloadAction<EmergencyRequestStatus>) => {
      state.status = action.payload;
      if (action.payload === 'arrived') {
        state.hasArrivedAlert = true;
      }
    },
    setEmergencyArrived: (state, action: PayloadAction<string | undefined>) => {
      state.status = 'arrived';
      state.hasArrivedAlert = true;
      if (action.payload) state.pickupOtp = action.payload;
    },
    dismissArrivedAlert: (state) => {
      state.hasArrivedAlert = false;
    },
    updateEta: (state, action: PayloadAction<number | null>) => {
      state.eta = action.payload;
    },
    updateNavigationRoute: (
      state,
      action: PayloadAction<{
        path?: [number, number][] | null;
        eta?: number | null;
        nextInstruction?: string | null;
      }>
    ) => {
      if (action.payload.path !== undefined) {
        state.navigationRoutePath = action.payload.path;
      }
      if (action.payload.eta != null) {
        state.eta = action.payload.eta;
      }
      if (action.payload.nextInstruction !== undefined) {
        state.nextNavInstruction = action.payload.nextInstruction;
      }
    },
    clearEmergency: (state) => {
      state.requestId = null;
      state.status = 'searching';
      state.ambulanceLocation = null;
      state.patientLocation = null;
      state.hospitalLocation = null;
      state.driverName = null;
      state.vehicleNumber = null;
      state.driverPhone = null;
      state.eta = null;
      state.isActive = false;
      state.isDelayed = false;
      state.hasArrivedAlert = false;
      state.pickupOtp = null;
      state.dispatchSnapshot = null;
      state.smartRecommendation = null;
      state.navigationRoutePath = null;
      state.nextNavInstruction = null;
    },
    activateOneTapEmergency: (
      state,
      action: PayloadAction<{
        requestId: string;
        dispatch: EmergencySosDispatchData;
        status?: EmergencyRequestStatus;
        patientLocation?: MapCoordinate;
      }>
    ) => {
      const patientLocation =
        action.payload.patientLocation ??
        action.payload.dispatch.assignedAmbulance.currentLocation ??
        state.patientLocation ??
        { lat: 0, lng: 0 };

      Object.assign(
        state,
        trackingFromDispatch(
          action.payload.requestId,
          action.payload.dispatch,
          patientLocation,
          action.payload.status ?? 'dispatched'
        )
      );
    },
  },
});

export const {
  openEmergency,
  closeEmergency,
  setHelpType,
  setNearbyHospitals,
  proceedAfterHelpChoice,
  setGuest,
  skipGuest,
  setTriageAnswer,
  setTriageRoute,
  setEmergencyStep,
  setEmergencyLocation,
  setActiveBooking,
  resetTriage,
  setEmergencyActive,
  updateAmbulanceLocation,
  updateStatus,
  setEmergencyArrived,
  dismissArrivedAlert,
  updateEta,
  updateNavigationRoute,
  clearEmergency,
  activateOneTapEmergency,
} = emergencySlice.actions;

export default emergencySlice.reducer;
