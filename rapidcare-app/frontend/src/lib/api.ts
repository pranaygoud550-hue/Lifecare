const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

export const api = {
  getStats: () => request<{ data: { ambulancesAvailable: number; averageResponseMinutes: number; bookingsToday: number } }>('/api/bookings/stats'),
  createBooking: (body: unknown) => request<{ data: { booking: { bookingId: string }; trackUrl: string } }>('/api/bookings/create', { method: 'POST', body: JSON.stringify(body) }),
  getBooking: (id: string) => request<{ data: Record<string, unknown> }>(`/api/bookings/${id}`),
  cancelBooking: (id: string) => request(`/api/bookings/${id}/cancel`, { method: 'POST' }),
  driverLogin: (phone: string, password: string) =>
    request<{ data: { token: string; driver: Record<string, unknown> } }>('/api/drivers/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),
  driverRequests: (token: string) =>
    request<{ data: { pending: unknown[]; mine: unknown[] } }>('/api/drivers/requests', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  acceptBooking: (token: string, id: string) =>
    request(`/api/bookings/${id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  updateStatus: (token: string, id: string, status: string) =>
    request(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),
  postLocation: (token: string, lat: number, lng: number) =>
    request('/api/bookings/drivers/location', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lat, lng }),
    }),
  verifyOtp: (token: string, id: string, otp: string) =>
    request(`/api/bookings/${id}/verify-otp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ otp }),
    }),
  driverEarnings: (token: string) =>
    request<{ data: { earnings: number; totalTrips: number } }>('/api/drivers/earnings', { headers: { Authorization: `Bearer ${token}` } }),
  adminLogin: (email: string, password: string) =>
    request<{ data: { token: string } }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminDashboard: (token: string) =>
    request<{ data: Record<string, unknown> }>('/api/admin/analytics/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
  liveBookings: () => request<{ data: unknown[] }>('/api/bookings/live'),
  placesAutocomplete: (input: string, lat?: number, lng?: number) => {
    const q = new URLSearchParams({ input });
    if (lat != null) q.set('lat', String(lat));
    if (lng != null) q.set('lng', String(lng));
    return request<{ data: { placeId: string; description: string; mainText: string }[] }>(`/api/places/autocomplete?${q}`);
  },
  placeDetails: (placeId: string) =>
    request<{ data: { placeId: string; name: string; address: string; coords: { lat: number; lng: number } } }>(
      `/api/places/details/${placeId}`
    ),
  nearestHospital: (lat: number, lng: number) =>
    request<{ data: { name: string; address: string; coords: { lat: number; lng: number }; distanceKm: number } }>(
      `/api/places/nearest-hospital?lat=${lat}&lng=${lng}`
    ),
};
