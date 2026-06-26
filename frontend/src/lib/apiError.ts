function sanitizeClientErrorMessage(message: string, fallback: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('database') && lower.includes('offline')) {
    return 'Server is waking up. Wait 20 seconds and refresh — or use Try instantly on Login.';
  }
  if (/can't extract geo keys|invalid geojson|invalid_geojson/i.test(message)) {
    return 'Location data is invalid. Please try again.';
  }
  if (
    message.length > 200 ||
    /objectid\(|password:|"\$2[aby]\$"|mongo(server)?error|plan executor error/i.test(message)
  ) {
    return fallback;
  }
  return message;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;

  const e = err as {
    status?: string | number;
    data?: {
      message?: string;
      code?: string;
      errors?: Array<{ message: string }>;
    };
    error?: string;
  };

  if (e.data?.code === 'DATABASE_OFFLINE') {
    return 'Server is waking up. Wait 20 seconds and refresh — or use Try instantly on Login.';
  }

  if (e.status === 'FETCH_ERROR' || e.error === 'TypeError: Failed to fetch') {
    return 'Server is waking up (Render cold start). Wait 20–30 seconds and try again.';
  }

  if (e.data?.message) {
    return sanitizeClientErrorMessage(e.data.message, fallback);
  }

  if (e.data?.errors?.length) {
    const joined = e.data.errors.map((issue) => issue.message).join('. ');
    return sanitizeClientErrorMessage(joined, fallback);
  }

  return fallback;
}
