import { Link, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { Calendar, Video, X, Star, CheckCircle, FileText, Scan } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  useGetAppointmentsQuery,
  useCancelAppointmentMutation,
  useCompleteAppointmentMutation,
} from '@/features/api/apiSlice';
import { useAppSelector } from '@/hooks/redux';
import { RatingModal } from '@/components/review/RatingModal';
import { SectionHero } from '@/components/common/SectionHero';
import { PositivePageShell } from '@/components/common/PositivePageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { AppointmentScanPreview } from '@/components/appointments/AppointmentScanPreview';
import { scanFromAppointment } from '@/lib/appointmentScanUtils';
import type { User, Appointment } from '@/types';

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'default',
  'in-progress': 'secondary',
  completed: 'success',
  cancelled: 'danger',
};

type FilterTab = 'all' | 'upcoming' | 'completed' | 'cancelled';

function canJoinLive(appointment: Appointment): boolean {
  if (!['confirmed', 'in-progress'].includes(appointment.status)) return false;
  if (!['video', 'audio'].includes(appointment.consultationType)) return false;
  const scheduled = new Date(appointment.scheduledDate);
  const [h, m] = appointment.scheduledTime.split(':').map(Number);
  scheduled.setHours(h, m, 0, 0);
  const diffMins = (scheduled.getTime() - Date.now()) / (1000 * 60);
  return appointment.status === 'in-progress' || (diffMins <= 5 && diffMins >= -60);
}

export function AppointmentsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [ratingTarget, setRatingTarget] = useState<{ id: string; doctorName: string } | null>(null);

  const { data, isLoading, refetch } = useGetAppointmentsQuery({});
  const [cancelAppointment] = useCancelAppointmentMutation();
  const [completeAppointment] = useCompleteAppointmentMutation();

  const allAppointments = useMemo(
    () => (data?.data?.appointments || []) as Appointment[],
    [data?.data?.appointments]
  );
  const isDoctor = user?.userType === 'doctor';

  const counts = useMemo(() => ({
    all: allAppointments.length,
    upcoming: allAppointments.filter((a) => ['pending', 'confirmed', 'in-progress'].includes(a.status)).length,
    completed: allAppointments.filter((a) => a.status === 'completed').length,
    cancelled: allAppointments.filter((a) => a.status === 'cancelled').length,
  }), [allAppointments]);

  const appointments = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return allAppointments.filter((a) => ['pending', 'confirmed', 'in-progress'].includes(a.status));
      case 'completed':
        return allAppointments.filter((a) => a.status === 'completed');
      case 'cancelled':
        return allAppointments.filter((a) => a.status === 'cancelled');
      default:
        return allAppointments;
    }
  }, [allAppointments, filter]);

  const handleCancel = async (id: string) => {
    try {
      await cancelAppointment({ id, reason: 'Cancelled by user' }).unwrap();
      toast.success('Appointment cancelled');
      refetch();
    } catch {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeAppointment(id).unwrap();
      toast.success('Appointment marked as completed');
      refetch();
    } catch {
      toast.error('Failed to complete appointment');
    }
  };

  const getOtherParty = (appointment: Appointment): User | null => {
    const party = isDoctor ? appointment.patientId : appointment.doctorId;
    if (typeof party === 'object') return party as User;
    return null;
  };

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="section-page-bg min-h-screen pb-6" style={{ '--section-tint': '#eef2ff' } as CSSProperties}>
      <div className="container-custom pt-4 sm:pt-6">
        <PositivePageShell className="space-y-6">
        <SectionHero
          icon={Calendar}
          theme="appointments"
          title="My Appointments"
          subtitle="Manage bookings — join live checkups when your doctor is ready."
          action={
            !isDoctor ? (
              <Link to="/doctors">
                <Button className="gap-2 shrink-0 bg-white text-indigo-700 hover:bg-white/90 shadow-lg">
                  <Calendar className="h-4 w-4" /> Book New
                </Button>
              </Link>
            ) : undefined
          }
        />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              filter === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white border border-border text-muted hover:text-foreground hover:border-indigo-200'
            )}
          >
            {tab.label}
            <span className="ml-1.5 opacity-80">({counts[tab.id]})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-border rounded-lg animate-pulse" />)}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="border-indigo-100 bg-white/80 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-indigo-600" />
            </div>
            <p className="text-lg font-medium mb-2">No {filter === 'all' ? '' : filter} appointments</p>
            {!isDoctor && filter !== 'cancelled' && (
              <>
                <p className="text-muted mb-6">Book a consultation with a verified doctor</p>
                <Link to="/doctors"><Button>Find a Doctor</Button></Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const other = getOtherParty(appointment);
            const name = isDoctor
              ? `${other?.profile.firstName} ${other?.profile.lastName}`
              : `Dr. ${other?.profile.firstName} ${other?.profile.lastName}`;
            const isLive = canJoinLive(appointment);
            const attachedScan = scanFromAppointment(appointment.scanReportId);

            return (
              <Card
                key={appointment._id}
                className={cn(
                  'overflow-hidden transition-all hover:shadow-md',
                  isLive
                    ? 'border-emerald-300/60 bg-gradient-to-r from-emerald-50/50 to-white shadow-sm'
                    : 'border-indigo-100/80 bg-white/90'
                )}
              >
                <CardContent className="p-6 space-y-4">
                  {attachedScan && (
                    <AppointmentScanPreview
                      scan={attachedScan}
                      variant={isDoctor ? 'doctor' : 'patient'}
                    />
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={other?.profile.profilePhoto} />
                      <AvatarFallback>
                        {getInitials(other?.profile.firstName, other?.profile.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold">{name}</h3>
                        <Badge variant={statusColors[appointment.status] || 'default'}>
                          {appointment.status}
                        </Badge>
                        {isLive && (
                          <Badge variant="success" className="gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            Live ready
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted capitalize">{appointment.consultationType} consultation</p>
                      <p className="text-sm">
                        {formatDate(appointment.scheduledDate)} at {appointment.scheduledTime}
                      </p>
                      <p className="text-xs text-muted mt-1">ID: {appointment.appointmentId}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isDoctor && appointment.status === 'in-progress' && (
                        <Button size="sm" variant="secondary" onClick={() => handleComplete(appointment._id)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Complete
                        </Button>
                      )}
                      {isDoctor && appointment.status === 'completed' && (
                        <Link to={`/prescriptions?appointment=${appointment._id}`}>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" /> Prescription
                          </Button>
                        </Link>
                      )}
                      {!isDoctor && isLive && (
                        <Button size="sm" onClick={() => navigate(`/live-checkup/${appointment._id}`)}>
                          <Video className="h-4 w-4 mr-1" /> Join Live
                        </Button>
                      )}
                      {!isDoctor && ['video', 'audio'].includes(appointment.consultationType) &&
                        ['confirmed', 'in-progress'].includes(appointment.status) && !isLive && (
                        <Link to="/live-checkup">
                          <Button size="sm" variant="outline">
                            <Video className="h-4 w-4 mr-1" /> Live Checkup
                          </Button>
                        </Link>
                      )}
                      {!isDoctor && attachedScan && (
                        <Link to={`/dashboard/mediscan?scan=${attachedScan._id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Scan className="h-4 w-4" /> View scan
                          </Button>
                        </Link>
                      )}
                      {!isDoctor && ['pending', 'confirmed'].includes(appointment.status) && (
                        <Button size="sm" variant="outline" onClick={() => handleCancel(appointment._id)}>
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                      )}
                      {!isDoctor && appointment.status === 'completed' && !appointment.rating && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setRatingTarget({
                            id: appointment._id,
                            doctorName: `${other?.profile.firstName} ${other?.profile.lastName}`,
                          })}
                        >
                          <Star className="h-4 w-4 mr-1" /> Rate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {ratingTarget && (
        <RatingModal
          appointmentId={ratingTarget.id}
          doctorName={ratingTarget.doctorName}
          onClose={() => setRatingTarget(null)}
          onSuccess={() => refetch()}
        />
      )}
        </PositivePageShell>
      </div>
    </div>
  );
}
