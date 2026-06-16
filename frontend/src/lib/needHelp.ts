import type { AppDispatch } from '@/store';
import {
  openAmbulanceEmergencyFlow,
  openEmergency,
  openHospitalRideFlow,
} from '@/features/emergency/emergencySlice';

/** Preload modal chunk so the help flow opens immediately. */
export function preloadEmergencyFlow() {
  void import('@/components/emergency/EmergencyFlowModal');
}

/** Opens the unified Need Help modal (ambulance SOS, hospital ride, video). */
export function dispatchNeedHelp(dispatch: AppDispatch) {
  preloadEmergencyFlow();
  dispatch(openEmergency());
}

export function dispatchHospitalRide(dispatch: AppDispatch) {
  preloadEmergencyFlow();
  dispatch(openHospitalRideFlow());
}

export function dispatchAmbulanceEmergency(dispatch: AppDispatch) {
  preloadEmergencyFlow();
  dispatch(openAmbulanceEmergencyFlow());
}
