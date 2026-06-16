import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { api } from '@/features/api/apiSlice';
import authReducer from '@/features/auth/authSlice';
import cartReducer from '@/features/cart/cartSlice';
import emergencyReducer, {
  openAmbulanceEmergencyFlow,
  openEmergency,
  openHospitalRideFlow,
} from '@/features/emergency/emergencySlice';
import accessibilityReducer from '@/features/accessibility/accessibilitySlice';

const emergencyPreloadMiddleware: Middleware = () => (next) => (action) => {
  if (
    openEmergency.match(action) ||
    openHospitalRideFlow.match(action) ||
    openAmbulanceEmergencyFlow.match(action)
  ) {
    void import('@/components/emergency/EmergencyFlowModal');
  }
  return next(action);
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    emergency: emergencyReducer,
    accessibility: accessibilityReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware, emergencyPreloadMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
