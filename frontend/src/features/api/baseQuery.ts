import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

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
});

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refresh = await rawBaseQuery(
      { url: '/auth/refresh-token', method: 'POST', body: {} },
      api,
      extraOptions
    );

    if (refresh.data) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};
