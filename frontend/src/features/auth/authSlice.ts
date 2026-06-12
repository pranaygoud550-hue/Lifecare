import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';
import { clearAuthTokens } from '@/lib/authTokens';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
}

const USER_KEY = 'user';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

const storedUser = readStoredUser();

const initialState: AuthState = {
  user: storedUser,
  isAuthenticated: !!storedUser,
  authStatus: 'loading',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.authStatus = 'authenticated';
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authStatus = 'anonymous';
      localStorage.removeItem(USER_KEY);
      clearAuthTokens();
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
    },
    setAuthStatus: (state, action: PayloadAction<AuthStatus>) => {
      state.authStatus = action.payload;
      if (action.payload === 'anonymous') {
        state.user = null;
        state.isAuthenticated = false;
        localStorage.removeItem(USER_KEY);
        clearAuthTokens();
      }
    },
  },
});

export const { setUser, logout, updateUser, setAuthStatus } = authSlice.actions;
export default authSlice.reducer;
