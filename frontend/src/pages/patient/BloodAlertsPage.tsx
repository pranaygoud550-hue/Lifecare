import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Droplets, MapPin, Navigation } from 'lucide-react';
import {
  useGetActiveBloodAlertsQuery,
  useGetMedicalHistoryQuery,
  useRespondToBloodAlertMutation,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BloodEmergencyAlert } from '@/types/bloodEmergency';

function mapsUrl(alert: BloodEmergencyAlert) {
  const { lat, lng } = alert.coordinates;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

function AlertCard({
  alert,
  myBloodGroup,
  onRespond,
  isResponding,
}: {
  alert: BloodEmergencyAlert;
  myBloodGroup?: string;
  onRespond: (id: string, status: 'on_my_way' | 'cannot_donate') => void;
  isResponding: boolean;
}) {
  const isMatch = myBloodGroup === alert.bloodGroup;
  const urgency =
    alert.urgency === 'critical' ? 'danger' : alert.urgency === 'urgent' ? 'warning' : 'outline';

  return (
    <Card className={isMatch ? 'border-red-300 ring-1 ring-red-200' : ''}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Droplets className="h-5 w-5 text-red-500" />
            {alert.bloodGroup} needed at {alert.hospitalName}
          </CardTitle>
          <div className="flex gap-2">
            {isMatch && <Badge variant="danger">Your group</Badge>}
            <Badge variant={urgency as 'danger' | 'warning' | 'outline'} className="capitalize">
              {alert.urgency}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted flex items-start gap-2">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
          {alert.address}
        </p>
        {alert.notes && <p className="text-sm">{alert.notes}</p>}
        {alert.unitsNeeded && (
          <p className="text-sm font-medium">{alert.unitsNeeded} unit(s) needed</p>
        )}
        <p className="text-xs text-muted">
          Posted {new Date(alert.createdAt).toLocaleString('en-IN')}
        </p>

        {isMatch ? (
          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2 bg-red-600 hover:bg-red-700"
              disabled={isResponding}
              onClick={() => onRespond(alert._id, 'on_my_way')}
            >
              <Navigation className="h-4 w-4" />
              I&apos;m on my way
            </Button>
            <Button
              variant="outline"
              disabled={isResponding}
              onClick={() => onRespond(alert._id, 'cannot_donate')}
            >
              Can&apos;t donate now
            </Button>
            <a href={mapsUrl(alert)} target="_blank" rel="noreferrer">
              <Button variant="outline" type="button" className="gap-2">
                <MapPin className="h-4 w-4" />
                Directions
              </Button>
            </a>
          </div>
        ) : (
          <p className="text-xs text-muted">
            This alert is for {alert.bloodGroup} donors. Your profile shows {myBloodGroup || 'no blood group'}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function BloodAlertsPage() {
  const { data: historyData } = useGetMedicalHistoryQuery();
  const { data, isLoading, refetch } = useGetActiveBloodAlertsQuery();
  const [respond, { isLoading: responding }] = useRespondToBloodAlertMutation();

  const myBloodGroup = historyData?.data?.bloodGroup;
  const alerts = data?.data ?? [];

  const handleRespond = async (id: string, status: 'on_my_way' | 'cannot_donate') => {
    try {
      await respond({ id, status }).unwrap();
      toast.success(status === 'on_my_way' ? 'Hospital notified — thank you!' : 'Response recorded');
      refetch();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : 'Could not send response';
      toast.error(msg || 'Could not send response');
    }
  };

  return (
    <div className="container-custom py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Blood needed in Hyderabad</h1>
        <p className="text-muted mt-1">
          Urgent requests from hospitals. If your blood group matches, you can go donate at the hospital blood bank.
        </p>
      </div>

      {!myBloodGroup && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 text-sm">
            Add your blood group in your{' '}
            <Link to="/dashboard/profile" className="text-primary font-medium underline">
              medical profile
            </Link>{' '}
            to receive matching alerts.
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted leading-relaxed">
        LifeCare+ only coordinates donors. Donate only at the hospital blood bank with valid ID. Medical staff will
        screen you before donation.
      </p>

      {isLoading && <p className="text-muted">Loading active alerts…</p>}

      {!isLoading && alerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            No active blood emergencies right now.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {alerts.map((alert) => (
          <AlertCard
            key={alert._id}
            alert={alert}
            myBloodGroup={myBloodGroup}
            onRespond={handleRespond}
            isResponding={responding}
          />
        ))}
      </div>
    </div>
  );
}
