import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Users } from 'lucide-react';
import {
  useGetHospitalBloodAlertQuery,
  useUpdateBloodAlertMutation,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function HospitalAlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useGetHospitalBloodAlertQuery(id!, { skip: !id });
  const [updateAlert, { isLoading: updating }] = useUpdateBloodAlertMutation();

  const alert = data?.data;

  const handleStatus = async (status: 'fulfilled' | 'cancelled') => {
    if (!id) return;
    try {
      await updateAlert({ id, status }).unwrap();
      toast.success(status === 'fulfilled' ? 'Alert marked fulfilled' : 'Alert cancelled');
      refetch();
    } catch {
      toast.error('Could not update alert');
    }
  };

  if (isLoading || !alert) {
    return <p className="text-muted">Loading alert…</p>;
  }

  const onMyWay = alert.responses.filter((r) => r.status === 'on_my_way');
  const cannot = alert.responses.filter((r) => r.status === 'cannot_donate');

  return (
    <div className="space-y-6">
      <Link to="/hospital" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {alert.bloodGroup} blood alert
          </h1>
          <p className="text-muted text-sm mt-1">{alert.hospitalName}</p>
        </div>
        <Badge variant={alert.status === 'active' ? 'warning' : 'outline'} className="capitalize">
          {alert.status}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">Patients notified</p>
            <p className="text-3xl font-bold">{alert.notifiedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">On the way</p>
            <p className="text-3xl font-bold text-red-600">{onMyWay.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert details</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><span className="text-muted">Address:</span> {alert.address}</p>
          {alert.unitsNeeded && <p><span className="text-muted">Units:</span> {alert.unitsNeeded}</p>}
          {alert.notes && <p><span className="text-muted">Notes:</span> {alert.notes}</p>}
          <p><span className="text-muted">Sent:</span> {new Date(alert.createdAt).toLocaleString('en-IN')}</p>
        </CardContent>
      </Card>

      {alert.status === 'active' && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleStatus('fulfilled')} disabled={updating}>
            Mark fulfilled
          </Button>
          <Button variant="outline" onClick={() => handleStatus('cancelled')} disabled={updating}>
            Cancel alert
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Donor responses ({alert.responses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {onMyWay.map((r) => (
            <div key={String(r.userId._id)} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
              <p className="font-medium">
                {r.userId.profile?.firstName} {r.userId.profile?.lastName} — On the way
              </p>
              <p className="text-muted text-xs">{r.userId.phone}</p>
            </div>
          ))}
          {cannot.map((r) => (
            <div key={String(r.userId._id)} className="rounded-lg border p-3 text-sm text-muted">
              {r.userId.profile?.firstName} {r.userId.profile?.lastName} — Cannot donate
            </div>
          ))}
          {alert.responses.length === 0 && (
            <p className="text-sm text-muted">No responses yet. Donors may still be on their way.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
