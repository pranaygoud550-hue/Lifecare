import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  const configured = import.meta.env.VITE_SOCKET_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const apiUrl = import.meta.env.VITE_API_URL?.trim();
  if (apiUrl?.startsWith('http')) {
    return apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  return window.location.origin
    .replace(':5173', ':5001')
    .replace(':5174', ':5001')
    .replace(':5175', ':5001');
}

export function getSocket(): Socket {
  if (!socket) {
    const url = resolveSocketUrl();
    socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function emergencyRoomId(requestId: string): string {
  return `emergency:${requestId}`;
}

export function joinEmergencyRoom(requestId: string) {
  getSocket().emit('join-emergency-room', requestId);
}

export function leaveEmergencyRoom(requestId: string) {
  getSocket().emit('leave-emergency-room', requestId);
}

export function emitPatientEmergencyLocation(requestId: string, lat: number, lng: number) {
  getSocket().emit('patient:locationUpdate', { requestId, lat, lng });
}

/** @deprecated use joinEmergencyRoom */
export function joinEmergencyTracking(requestId: string) {
  joinEmergencyRoom(requestId);
}

export function joinTransportTracking(bookingId: string) {
  getSocket().emit('join-transport-tracking', bookingId);
}

export function joinDriverRoom(driverId: string) {
  getSocket().emit('join-driver', driverId);
}

export function joinUserRoom(userId: string) {
  getSocket().emit('join-user', userId);
}
