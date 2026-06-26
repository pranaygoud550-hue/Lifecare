export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;

  const e = err as {
    status?: string | number;
    data?: { message?: string; errors?: Array<{ message: string }> };
    error?: string;
  };

  if (e.status === 'FETCH_ERROR' || e.error === 'TypeError: Failed to fetch') {
    return 'Server is waking up (Render cold start). Wait 20–30 seconds and try again.';
  }

  if (e.data?.message) {
    if (e.data.message.toLowerCase().includes('database') && e.data.message.toLowerCase().includes('offline')) {
      return 'Server is waking up. Wait 20 seconds and refresh — or use Try instantly on Login.';
    }
    return e.data.message;
  }

  if (e.data?.errors?.[0]?.message) return e.data.errors[0].message;

  return fallback;
}
