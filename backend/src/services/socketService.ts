import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { isAllowedFrontendOrigin } from '../config/corsOrigins.js';
import {
  emergencyRoom,
  joinPatientEmergencyRoom,
  registerEmergencySocketHandlers,
} from './emergencyRealtimeService.js';

let io: Server;

type AuthenticatedSocket = Socket & {
  data: {
    userId?: string;
    userType?: string;
    authenticated?: boolean;
  };
};

export const initializeSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedFrontendOrigin(origin)) {
          callback(null, origin ?? true);
          return;
        }
        console.warn(`Socket.io CORS blocked origin: ${origin ?? '(missing)'}`);
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    registerEmergencySocketHandlers(io, socket);

    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', { socketId: socket.id });
    });

    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { socketId: socket.id });
    });

    socket.on('offer', ({ roomId, offer }) => {
      socket.to(roomId).emit('offer', { offer, socketId: socket.id });
    });

    socket.on('answer', ({ roomId, answer }) => {
      socket.to(roomId).emit('answer', { answer, socketId: socket.id });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { candidate, socketId: socket.id });
    });

    socket.on('chat-message', ({ roomId, message, sender }) => {
      io.to(roomId).emit('chat-message', { message, sender, timestamp: new Date() });
    });

    socket.on('ambulance-location', ({ requestId, location }) => {
      io.to(`ambulance-${requestId}`).emit('location-update', { location, timestamp: new Date() });
    });

    socket.on('join-ambulance-tracking', (requestId: string) => {
      socket.join(`ambulance-${requestId}`);
    });

    socket.on('join-emergency-tracking', async (requestId: string) => {
      await joinPatientEmergencyRoom(socket, requestId);
    });

    socket.on('join-transport-tracking', (bookingId: string) => {
      socket.join(`transport-${bookingId}`);
    });

    socket.on('join-driver', (driverId: string) => {
      socket.join(`driver-${driverId}`);
    });

    socket.on(
      'transport-location',
      ({ bookingId, location }: { bookingId: string; location: { lat: number; lng: number } }) => {
        io.to(`transport-${bookingId}`).emit('transport:location', { location, timestamp: new Date() });
      }
    );

    socket.on('notification', ({ userId, notification }) => {
      io.to(`user-${userId}`).emit('notification', notification);
    });

    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  io?.to(`user-${userId}`).emit(event, data);
};

export const emitToRoom = (roomId: string, event: string, data: unknown): void => {
  io?.to(roomId).emit(event, data);
};

export const emitToEmergencyRoom = (requestId: string, event: string, data: unknown): void => {
  io?.to(emergencyRoom(requestId)).emit(event, data);
};

export const getSocketConnectionCount = (): number => {
  if (!io) return 0;
  return io.engine?.clientsCount ?? io.sockets.sockets.size;
};

export { emergencyRoom };
