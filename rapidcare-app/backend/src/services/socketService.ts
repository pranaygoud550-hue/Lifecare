import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('join:booking', (bookingId: string) => {
      socket.join(`booking:${bookingId}`);
    });
    socket.on('join:driver', (driverId: string) => {
      socket.join(`driver:${driverId}`);
    });
    socket.on('join:drivers', () => {
      socket.join('drivers:available');
    });
    socket.on('join:admin', () => {
      socket.join('admin');
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitBookingCreated(booking: { bookingId: string; pickupLocation: unknown; vehicleType: string }) {
  getIO().to('drivers:available').emit('booking:created', booking);
}

export function emitDriverLocation(bookingId: string, payload: { lat: number; lng: number; etaMinutes?: number }) {
  getIO().to(`booking:${bookingId}`).emit('driver:location', payload);
}

export function emitBookingAccepted(bookingId: string, driver: { name: string; phone: string; vehicleNumber: string }) {
  getIO().to(`booking:${bookingId}`).emit('booking:accepted', { bookingId, driver });
}

export function emitBookingCompleted(bookingId: string) {
  getIO().to(`booking:${bookingId}`).emit('booking:completed', { bookingId });
  getIO().to('admin').emit('booking:completed', { bookingId });
}
