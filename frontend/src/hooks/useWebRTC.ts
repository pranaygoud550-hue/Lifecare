import { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export function useWebRTC(
  socket: Socket | null,
  roomId: string | null,
  enabled: boolean
) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!socket || !roomId || !enabled) return;

    let cancelled = false;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    const onUserJoined = async ({ socketId }: { socketId: string }) => {
      if (socketId === socket.id || cancelled) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
      } catch {
        /* peer may already have started negotiation */
      }
    };

    const onOffer = async ({
      offer,
      socketId,
    }: {
      offer: RTCSessionDescriptionInit;
      socketId: string;
    }) => {
      if (socketId === socket.id || cancelled) return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { roomId, answer });
    };

    const onAnswer = async ({
      answer,
      socketId,
    }: {
      answer: RTCSessionDescriptionInit;
      socketId: string;
    }) => {
      if (socketId === socket.id || cancelled) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIceCandidate = async ({
      candidate,
      socketId,
    }: {
      candidate: RTCIceCandidateInit;
      socketId: string;
    }) => {
      if (socketId === socket.id || !candidate || cancelled) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* duplicate or late candidate */
      }
    };

    pc.ontrack = (ev) => {
      if (remoteVideoRef.current && ev.streams[0]) {
        remoteVideoRef.current.srcObject = ev.streams[0];
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket.emit('ice-candidate', { roomId, candidate: ev.candidate });
      }
    };

    socket.on('user-joined', onUserJoined);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);

    void navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          void localVideoRef.current.play().catch(() => undefined);
        }
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      socket.off('user-joined', onUserJoined);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
      cleanup();
    };
  }, [socket, roomId, enabled, cleanup]);

  const setMicEnabled = useCallback((on: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = on;
    });
  }, []);

  const setVideoEnabled = useCallback((on: boolean) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = on;
    });
  }, []);

  return { localVideoRef, remoteVideoRef, setMicEnabled, setVideoEnabled };
}
