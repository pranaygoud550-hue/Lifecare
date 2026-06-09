import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { getSocket, joinUserRoom } from '@/lib/socket';
import type { ScanCompletePayload } from '@/types/mediscan';

interface MediScanSocketHandlers {
  onComplete?: (payload: ScanCompletePayload) => void;
  onAiUnavailable?: (payload: { scanId: string; status: string; imageUrl?: string }) => void;
}

export function useMediScanSocket(handlers: MediScanSocketHandlers) {
  const userId = useAppSelector((s) => s.auth.user?._id);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    joinUserRoom(userId);

    const onComplete = (payload: ScanCompletePayload) => {
      handlersRef.current.onComplete?.(payload);
    };
    const onAiUnavailable = (payload: { scanId: string; status: string }) => {
      handlersRef.current.onAiUnavailable?.(payload);
    };

    socket.on('scan:complete', onComplete);
    socket.on('scan:ai_unavailable', onAiUnavailable);

    return () => {
      socket.off('scan:complete', onComplete);
      socket.off('scan:ai_unavailable', onAiUnavailable);
    };
  }, [userId]);
}
