import { Link } from 'react-router-dom';
import { Droplets, Plus } from 'lucide-react';
import {
  useGetHospitalBloodAlertsQuery,
  useGetHospitalProfileQuery,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function urgencyBadge(urgency: string) {
  if (urgency === 'critical') return <Badge variant="danger">Critical</Badge>;
  if (urgency === 'urgent') return <Badge variant="warning">Urgent</Badge>;
  return <Badge variant="outline">Normal</Badge>;
}

export function HospitalDashboardPage() {
  const { data: profileData } = useGetHospitalProfileQuery();
  const { data, isLoading } = useGetHospitalBloodAlertsQuery();

  const hospital = profileData?.data?.hospitalAdminDetails?.hospitalId;
  const alerts = data?.data ?? [];

  const active = alerts.filter((a) => a.status === 'active');
  const onMyWayTotal = active.reduce(
    (sum, a) => sum + a.responses.filter((r) => r.status === 'on_my_way').length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Blood alert dashboard</h1>
          <p className="text-muted text-sm mt-1">
            {hospital?.name ?? 'Your hospital'} — notify donors by blood group across Hyderabad
          </p>
        </div>
        <Link to="/hospital/blood-request">
          <Button className="gap-2 bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4" />
            New blood request
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">Active alerts</p>
            <p className="text-3xl font-bold text-red-600">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">Donors on the way</p>
            <p className="text-3xl font-bold">{onMyWayTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">Total alerts sent</p>
            <p className="text-3xl font-bold">{alerts.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Droplets className="h-5 w-5 text-red-500" />
            Recent alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted">Loading…</p>}
          {!isLoading && alerts.length === 0 && (
            <p className="text-sm text-muted">No blood alerts yet. Create one when a patient needs blood.</p>
          )}
          {alerts.map((alert) => {
            const onMyWay = alert.responses.filter((r) => r.status === 'on_my_way').length;
            return (
              <Link
                key={alert._id}
                to={`/hospital/alerts/${alert._id}`}
                className="block rounded-xl border p-4 hover:border-red-200 hover:bg-red-50/30 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {alert.bloodGroup} needed — {alert.notifiedCount} notified
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(alert.createdAt).toLocaleString('en-IN')} · {onMyWay} on the way
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {urgencyBadge(alert.urgency)}
                    <Badge variant={alert.status === 'active' ? 'warning' : 'outline'} className="capitalize">
                      {alert.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
