import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  updateAmbulanceLocation,
  updateStatus,
  setEmergencyArrived,
  updateEta,
  clearEmergency,
} from '@/features/emergency/emergencySlice';
import {
  getSocket,
  joinEmergencyRoom,
  leaveEmergencyRoom,
} from '@/lib/socket';
import type { EmergencyRequestStatus } from '@/types';

interface AmbulanceLocationPayload {
  requestId?: string;
  location?: { lat: number; lng: number };
  calculatedETA?: number | null;
}

interface EmergencyStatusPayload {
  requestId?: string;
  status?: EmergencyRequestStatus;
  pickupOtp?: string;
  message?: string;
}

export function useEmergencySocket() {
  const dispatch = useAppDispatch();
  const requestId = useAppSelector((s) => s.emergency.requestId);
  const isActive = useAppSelector((s) => s.emergency.isActive);

  useEffect(() => {
    if (!isActive || !requestId) return;

    const socket = getSocket();
    joinEmergencyRoom(requestId);

    const onLocationUpdate = (payload: AmbulanceLocationPayload) => {
      if (payload.requestId && payload.requestId !== requestId) return;
      if (!payload.location) return;

      dispatch(
        updateAmbulanceLocation({
          lat: payload.location.lat,
          lng: payload.location.lng,
          eta: payload.calculatedETA ?? undefined,
        })
      );

      if (payload.calculatedETA != null) {
        dispatch(updateEta(payload.calculatedETA));
      }
    };

    const onStatusUpdate = (payload: EmergencyStatusPayload) => {
      if (payload.requestId && payload.requestId !== requestId) return;
      if (!payload.status) return;
      dispatch(updateStatus(payload.status));
      if (payload.status === 'arrived' && payload.pickupOtp) {
        dispatch(setEmergencyArrived(payload.pickupOtp));
      }
    };

    const onArrived = (payload: { requestId?: string; pickupOtp?: string }) => {
      if (payload.requestId && payload.requestId !== requestId) return;
      dispatch(setEmergencyArrived(payload.pickupOtp));
    };

    const onNoAmbulance = (payload: { requestId?: string; message?: string }) => {
      if (payload.requestId && payload.requestId !== requestId) return;
      toast.error(payload.message || 'No ambulance available. Call 108.');
      dispatch(clearEmergency());
    };

    const onCancelled = (payload: { requestId?: string }) => {
      if (payload.requestId && payload.requestId !== requestId) return;
      toast.info('Emergency request was cancelled.');
      dispatch(clearEmergency());
    };

    const onReassigned = (payload: EmergencyStatusPayload) => {
      if (payload.requestId && payload.requestId !== requestId) return;
      if (payload.status) dispatch(updateStatus(payload.status));
      toast.info(payload.message || 'Reassigned to another ambulance');
    };

    socket.on('ambulance:locationUpdate', onLocationUpdate);
    socket.on('emergency:statusUpdate', onStatusUpdate);
    socket.on('emergency:arrived', onArrived);
    socket.on('emergency:noAmbulance', onNoAmbulance);
    socket.on('emergency:cancelled', onCancelled);
    socket.on('emergency:reassigned', onReassigned);
    socket.on('emergency:completed', onCancelled);

    return () => {
      socket.off('ambulance:locationUpdate', onLocationUpdate);
      socket.off('emergency:statusUpdate', onStatusUpdate);
      socket.off('emergency:arrived', onArrived);
      socket.off('emergency:noAmbulance', onNoAmbulance);
      socket.off('emergency:cancelled', onCancelled);
      socket.off('emergency:reassigned', onReassigned);
      socket.off('emergency:completed', onCancelled);
      leaveEmergencyRoom(requestId);
    };
  }, [dispatch, isActive, requestId]);
}
