const ACCESS_TOKEN_KEY = 'lifecare_access_token';
const REFRESH_TOKEN_KEY = 'lifecare_refresh_token';

/** Persist tokens in localStorage so sessions survive page reload and new tabs. */
export function storeAuthTokens(accessToken?: string, refreshToken?: string): void {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  let token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) {
    const legacy = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(ACCESS_TOKEN_KEY, legacy);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      token = legacy;
    }
  }
  return token;
}

export function getRefreshToken(): string | null {
  let token = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!token) {
    const legacy = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(REFRESH_TOKEN_KEY, legacy);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      token = legacy;
    }
  }
  return token;
}

export function hasAuthTokens(): boolean {
  return Boolean(getAccessToken() || getRefreshToken());
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
