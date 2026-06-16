import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url =
      import.meta.env.VITE_SOCKET_URL ||
      window.location.origin
        .replace(':5173', ':5001')
        .replace(':5174', ':5001')
        .replace(':5175', ':5001');
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
