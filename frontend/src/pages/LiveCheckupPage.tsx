import { Link, useNavigate } from 'react-router-dom';
import { Video, Mic, Calendar, Clock, Radio } from 'lucide-react';
import { toast } from 'react-toastify';
import { useGetAppointmentsQuery } from '@/features/api/apiSlice';
import { useAppSelector } from '@/hooks/redux';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, getInitials } from '@/lib/utils';
import type { User, Appointment } from '@/types';

function canJoinNow(appointment: Appointment): boolean {
  if (!['confirmed', 'in-progress'].includes(appointment.status)) return false;
  if (!['video', 'audio'].includes(appointment.consultationType)) return false;

  const scheduled = new Date(appointment.scheduledDate);
  const [hours, minutes] = appointment.scheduledTime.split(':').map(Number);
  scheduled.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const diffMs = scheduled.getTime() - now.getTime();
  const diffMins = diffMs / (1000 * 60);

  return appointment.status === 'in-progress' || (diffMins <= 5 && diffMins >= -60);
}

function getWaitLabel(appointment: Appointment): string {
  const scheduled = new Date(appointment.scheduledDate);
  const [hours, minutes] = appointment.scheduledTime.split(':').map(Number);
  scheduled.setHours(hours, minutes, 0, 0);
  const now = new Date();
  const diffMins = Math.round((scheduled.getTime() - now.getTime()) / (1000 * 60));

  if (appointment.status === 'in-progress') return 'In progress — join now';
  if (diffMins <= 0) return 'Ready to join';
  if (diffMins <= 60) return `Starts in ${diffMins} min`;
  return `Scheduled ${formatDate(appointment.scheduledDate)} at ${appointment.scheduledTime}`;
}

export function LiveCheckupPage() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const isDoctor = user?.userType === 'doctor';

  const { data, isLoading, refetch } = useGetAppointmentsQuery({});

  const appointments = (data?.data?.appointments || []) as Appointment[];

  const liveAppointments = appointments.filter(
    (a) =>
      ['video', 'audio', 'chat'].includes(a.consultationType) &&
      ['confirmed', 'in-progress'].includes(a.status)
  );

  const readyToJoin = liveAppointments.filter((a) => canJoinNow(a));
  const upcoming = liveAppointments.filter((a) => !canJoinNow(a) && a.status !== 'cancelled');

  const getOtherParty = (appointment: Appointment): User | null => {
    const party = isDoctor ? appointment.patientId : appointment.doctorId;
    if (typeof party === 'object') return party as User;
    return null;
  };

  const handleJoin = (id: string) => {
    if (!canJoinNow(liveAppointments.find((a) => a._id === id)!)) {
      toast.info('Consultation is not ready yet. Please wait until scheduled time.');
      return;
    }
    navigate(`/live-checkup/${id}`);
  };

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-secondary/10">
            <Video className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Live Checkup</h1>
            <p className="text-muted">
              {isDoctor
                ? 'Join video or audio consultations with your patients'
                : 'Online consultations with verified doctors in real time'}
            </p>
          </div>
        </div>

        {readyToJoin.length > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-secondary/10 rounded-lg border border-secondary/30">
            <Radio className="h-4 w-4 text-secondary animate-pulse" />
            <span className="text-sm font-medium text-secondary">
              {readyToJoin.length} consultation{readyToJoin.length > 1 ? 's' : ''} ready to join now
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 bg-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : liveAppointments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Video className="h-14 w-14 text-muted mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-semibold mb-2">No live consultations scheduled</h2>
            <p className="text-muted mb-6 max-w-md mx-auto">
              {isDoctor
                ? 'Your video and audio appointments will appear here when patients book.'
                : 'Book a video or audio consultation to start an online checkup.'}
            </p>
            {!isDoctor && (
              <Link to="/doctors">
                <Button className="gap-2">
                  <Calendar className="h-4 w-4" /> Book Online Consultation
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {readyToJoin.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                Join Now ({readyToJoin.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {readyToJoin.map((appointment) => {
                  const other = getOtherParty(appointment);
                  const name = isDoctor
                    ? `${other?.profile.firstName} ${other?.profile.lastName}`
                    : `Dr. ${other?.profile.firstName} ${other?.profile.lastName}`;

                  return (
                    <Card key={appointment._id} className="border-secondary/40 bg-secondary/5">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-14 w-14 ring-2 ring-secondary">
                            <AvatarImage src={other?.profile.profilePhoto} />
                            <AvatarFallback>
                              {getInitials(other?.profile.firstName, other?.profile.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-semibold">{name}</h3>
                              <Badge variant="success">Live</Badge>
                              <Badge variant="outline" className="capitalize">
                                {appointment.consultationType === 'video' ? (
                                  <><Video className="h-3 w-3 mr-1 inline" /> Video</>
                                ) : (
                                  <><Mic className="h-3 w-3 mr-1 inline" /> Audio</>
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {getWaitLabel(appointment)}
                            </p>
                            <p className="text-xs text-muted mt-1">ID: {appointment.appointmentId}</p>
                            <Button
                              className="mt-4 w-full gap-2"
                              size="lg"
                              onClick={() => handleJoin(appointment._id)}
                            >
                              <Video className="h-4 w-4" />
                              Join Live Checkup
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Upcoming ({upcoming.length})</h2>
              <div className="space-y-3">
                {upcoming.map((appointment) => {
                  const other = getOtherParty(appointment);
                  const name = isDoctor
                    ? `${other?.profile.firstName} ${other?.profile.lastName}`
                    : `Dr. ${other?.profile.firstName} ${other?.profile.lastName}`;
                  const joinable = canJoinNow(appointment);

                  return (
                    <Card key={appointment._id}>
                      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={other?.profile.profilePhoto} />
                          <AvatarFallback>
                            {getInitials(other?.profile.firstName, other?.profile.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium">{name}</h3>
                          <p className="text-sm text-muted capitalize flex items-center gap-2">
                            {appointment.consultationType}
                            <span>·</span>
                            {formatDate(appointment.scheduledDate)} at {appointment.scheduledTime}
                          </p>
                          <Badge variant="warning" className="mt-1 capitalize">{appointment.status}</Badge>
                        </div>
                        <Button
                          variant={joinable ? 'default' : 'outline'}
                          disabled={!joinable}
                          onClick={() => handleJoin(appointment._id)}
                          className="gap-2 shrink-0"
                        >
                          <Video className="h-4 w-4" />
                          {joinable ? 'Join' : 'Not yet'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button variant="ghost" onClick={() => refetch()}>
          Refresh consultations
        </Button>
      </div>
    </div>
  );
}
