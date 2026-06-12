import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useAppSelector } from '@/hooks/redux';
import { getSocket, joinUserRoom } from '@/lib/socket';
import type { Notification } from '@/types';

/** Shared Socket.IO connection — avoids opening a new socket on every render. */
export function useSocket(onNotification?: (notification: Notification) => void): Socket | null {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    joinUserRoom(user._id);

    const onNotif = (notification: Notification) => {
      handlerRef.current?.(notification);
    };

    socket.on('notification', onNotif);
    socket.on('notification:new', onNotif);
    return () => {
      socket.off('notification', onNotif);
      socket.off('notification:new', onNotif);
    };
  }, [isAuthenticated, user?._id]);

  return isAuthenticated && user ? getSocket() : null;
}
