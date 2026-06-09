import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, User, Clock,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetAppointmentByIdQuery,
  useJoinConsultationMutation,
  useCompleteAppointmentMutation,
} from '@/features/api/apiSlice';
import { useAppSelector } from '@/hooks/redux';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, formatDate } from '@/lib/utils';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { User as UserType } from '@/types';

interface ChatMessage {
  message: string;
  sender: string;
  timestamp: string;
}

export function ConsultationRoomPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useGetAppointmentByIdQuery(appointmentId!, { skip: !appointmentId });
  const [joinConsultation] = useJoinConsultationMutation();
  const [completeAppointment] = useCompleteAppointmentMutation();

  const appointment = data?.data;
  const isDoctor = user?.userType === 'doctor';

  const getOtherParty = (): UserType | null => {
    if (!appointment) return null;
    const party = isDoctor ? appointment.patientId : appointment.doctorId;
    if (typeof party === 'object') return party as UserType;
    return null;
  };

  const other = getOtherParty();

  useEffect(() => {
    if (!appointmentId) return;
    joinConsultation(appointmentId)
      .unwrap()
      .then((res) => {
        setRoomId(res.data.roomId);
        toast.success('Connected to consultation room');
      })
      .catch(() => toast.error('Could not join room'));
  }, [appointmentId, joinConsultation]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const socket = useSocket();
  const isVideoConsult = appointment?.consultationType === 'video';
  const { localVideoRef, remoteVideoRef, setMicEnabled, setVideoEnabled } = useWebRTC(
    socket,
    roomId,
    isVideoConsult && !!roomId
  );

  useEffect(() => {
    setMicEnabled(micOn);
  }, [micOn, setMicEnabled]);

  useEffect(() => {
    setVideoEnabled(videoOn);
  }, [videoOn, setVideoEnabled]);

  useEffect(() => {
    if (!socket || !roomId || !user) return;

    socket.emit('join-room', roomId);

    const onChat = (data: { message: string; sender: string; timestamp: Date }) => {
      setMessages((prev) => [
        ...prev,
        {
          message: data.message,
          sender: data.sender,
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
        },
      ]);
    };

    socket.on('chat-message', onChat);
    return () => {
      socket.off('chat-message', onChat);
      socket.emit('leave-room', roomId);
    };
  }, [socket, roomId, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !roomId || !user) return;
    socket.emit('chat-message', {
      roomId,
      message: chatInput.trim(),
      sender: `${user.profile.firstName} ${user.profile.lastName}`,
    });
    setMessages((prev) => [
      ...prev,
      {
        message: chatInput.trim(),
        sender: 'You',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setChatInput('');
  };

  const handleEndCall = async () => {
    if (isDoctor && appointmentId) {
      try {
        await completeAppointment(appointmentId).unwrap();
        toast.success('Consultation completed');
        navigate(`/prescriptions?appointment=${appointmentId}`);
        return;
      } catch {
        toast.error('Failed to complete');
      }
    }
    if (!isDoctor) {
      navigate('/prescriptions');
      return;
    }
    navigate('/live-checkup');
  };

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading || !appointment) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">Connecting to consultation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-foreground/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={other?.profile.profilePhoto} />
            <AvatarFallback>
              {getInitials(other?.profile.firstName, other?.profile.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {isDoctor
                ? `${other?.profile.firstName} ${other?.profile.lastName}`
                : `Dr. ${other?.profile.firstName} ${other?.profile.lastName}`}
            </p>
            <p className="text-xs text-muted capitalize">{appointment.consultationType} · {formatDate(appointment.scheduledDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-secondary" />
          <span className="font-mono text-secondary">{formatElapsed(elapsed)}</span>
          <span className="text-xs text-muted hidden sm:inline">Live</span>
        </div>
      </div>

      <div className="flex-1 flex relative">
        <div className="flex-1 flex items-center justify-center p-4 gap-4">
          <div className="relative w-full max-w-2xl aspect-video bg-black/80 rounded-xl overflow-hidden border border-border">
            {isVideoConsult ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {!videoOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <VideoOff className="h-12 w-12 text-white/60" />
                  </div>
                )}
                <div className="absolute bottom-3 right-3 w-32 h-24 bg-black/60 rounded-lg border border-white/20 overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </>
            ) : videoOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                <User className="h-20 w-20 mb-2 opacity-50" />
                <p className="text-sm">{other?.profile.firstName} (Remote)</p>
                <p className="text-xs opacity-60 mt-1">{appointment.consultationType} consultation</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/60">
                <VideoOff className="h-12 w-12" />
              </div>
            )}
          </div>
        </div>

        {chatOpen && (
          <Card className="w-80 m-4 flex flex-col max-h-[calc(100vh-12rem)] shrink-0">
            <CardContent className="p-0 flex flex-col h-full min-h-[300px]">
              <div className="p-3 border-b border-border font-medium text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Chat
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted text-center py-4">No messages yet</p>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`text-sm p-2 rounded-lg ${
                        msg.sender === 'You' ? 'bg-primary/10 ml-4' : 'bg-background mr-4'
                      }`}
                    >
                      <p className="text-xs font-medium text-muted mb-0.5">{msg.sender}</p>
                      <p>{msg.message}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-border flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="text-sm"
                />
                <Button type="submit" size="sm">Send</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 py-4 bg-card border-t border-border">
        <Button
          variant={micOn ? 'outline' : 'danger'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => setMicOn(!micOn)}
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={videoOn ? 'outline' : 'danger'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => setVideoOn(!videoOn)}
        >
          {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={chatOpen ? 'default' : 'outline'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => setChatOpen(!chatOpen)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          variant="danger"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
