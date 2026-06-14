import type { AppDispatch } from '@/store';
import { openEmergency } from '@/features/emergency/emergencySlice';

/** Opens the unified Need Help modal (ambulance SOS, hospital ride, video). */
export function dispatchNeedHelp(dispatch: AppDispatch) {
  dispatch(openEmergency());
}
