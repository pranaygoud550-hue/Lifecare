import { configureStore } from '@reduxjs/toolkit';
import { api } from '@/features/api/apiSlice';
import authReducer from '@/features/auth/authSlice';
import cartReducer from '@/features/cart/cartSlice';
import emergencyReducer from '@/features/emergency/emergencySlice';
import accessibilityReducer from '@/features/accessibility/accessibilitySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    emergency: emergencyReducer,
    accessibility: accessibilityReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
