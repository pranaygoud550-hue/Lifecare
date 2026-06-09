/** Strip trailing slashes so env values match browser Origin headers exactly. */
export function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

const LOCAL_DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function parseConfiguredOrigins(): string[] {
  const origins: string[] = [];

  if (process.env.FRONTEND_URL?.trim()) {
    origins.push(normalizeOrigin(process.env.FRONTEND_URL));
  }

  if (process.env.FRONTEND_URLS?.trim()) {
    for (const part of process.env.FRONTEND_URLS.split(',')) {
      const trimmed = part.trim();
      if (trimmed) origins.push(normalizeOrigin(trimmed));
    }
  }

  return origins;
}

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

/** Allowed browser origins for Express CORS and Socket.io. */
export function getFrontendOrigins(): string[] {
  const configured = parseConfiguredOrigins();
  const isDev = process.env.NODE_ENV !== 'production';

  if (configured.length === 0 && isDev) {
    return [...DEV_ORIGINS];
  }

  return [...new Set([...configured, ...(isDev ? DEV_ORIGINS : [])])];
}

export function isAllowedFrontendOrigin(origin: string | undefined): boolean {
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);

  if (
    process.env.NODE_ENV !== 'production' &&
    LOCAL_DEV_ORIGIN.test(normalized)
  ) {
    return true;
  }

  return getFrontendOrigins().includes(normalized);
}

export function logCorsConfig(): void {
  const origins = getFrontendOrigins();
  if (origins.length === 0) {
    console.warn(
      '⚠️  CORS: no FRONTEND_URL configured — browser requests from your Railway frontend will be blocked.'
    );
    console.warn('   Set FRONTEND_URL=https://lifecare-frontend.up.railway.app on the backend service.');
    return;
  }
  console.log(`CORS allowed origins: ${origins.join(', ')}`);
}
