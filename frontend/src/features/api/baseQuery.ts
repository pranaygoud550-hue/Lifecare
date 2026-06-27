import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { getAccessToken, getRefreshToken, storeAuthTokens } from '@/lib/authTokens';

/** Ensures absolute API URLs always include the /api prefix (backend mounts routes under /api). */
export function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || '/api').trim();
  if (!raw || raw === '/') return '/api';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const base = raw.replace(/\/+$/, '');
    return base.endsWith('/api') ? base : `${base}/api`;
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: resolveApiBaseUrl(),
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

type RefreshPayload = {
  success?: boolean;
  data?: { accessToken?: string; refreshToken?: string; message?: string };
};

const MAX_WAKE_RETRIES = 4;
const WAKE_RETRY_MS = 5000;

function isServerWakingError(error: FetchBaseQueryError): boolean {
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') return true;
  if (error.status !== 503) return false;
  const data = error.data as { code?: string } | undefined;
  return data?.code === 'DATABASE_OFFLINE';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  let wakeAttempt = 0;
  while (result.error && isServerWakingError(result.error) && wakeAttempt < MAX_WAKE_RETRIES) {
    wakeAttempt += 1;
    await sleep(WAKE_RETRY_MS);
    result = await rawBaseQuery(args, api, extraOptions);
  }

  if (result.error && result.error.status === 401) {
    const storedRefresh = getRefreshToken();
    const refresh = await rawBaseQuery(
      {
        url: '/auth/refresh-token',
        method: 'POST',
        body: storedRefresh ? { refreshToken: storedRefresh } : {},
      },
      api,
      extraOptions
    );

    const payload = refresh.data as RefreshPayload | undefined;
    if (payload?.data?.accessToken) {
      storeAuthTokens(payload.data.accessToken, payload.data.refreshToken);
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};
