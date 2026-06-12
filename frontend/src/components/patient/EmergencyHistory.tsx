import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ambulance } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/hooks/redux';
import {
  useGetRapidCareHistoryQuery,
  useShareRapidCareReportMutation,
} from '@/features/api/apiSlice';
import { RapidCareWidget } from '@/components/dashboard/RapidCareWidget';

type EmergencyRecord = {
  _id: string;
  bookingId: string;
  eventType: string;
  patientName: string;
  pickupAddress: string;
  destinationHospital: string;
  vehicleType: string;
  driverName?: string;
  vehicleNumber?: string;
  responseTimeMinutes?: number;
  fare: number;
  paymentStatus: string;
  dispatchTime?: string;
  arrivalTime?: string;
  completedTime?: string;
  condition: string;
  sharedWithDoctor: boolean;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  BOOKING_CREATED: 'Searching',
  DRIVER_ASSIGNED: 'Assigned',
  DRIVER_ARRIVING: 'En route',
  COMPLETED: 'Completed',
};

const STATUS_CLASS: Record<string, string> = {
  BOOKING_CREATED: 'bg-amber-100 text-amber-800',
  DRIVER_ASSIGNED: 'bg-blue-100 text-blue-800',
  DRIVER_ARRIVING: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

export function EmergencyHistory() {
  const { t } = useTranslation();
  const { user } = useAppSelector((s) => s.auth);
  const patientId = user?._id || '';
  const { data, isLoading } = useGetRapidCareHistoryQuery(patientId, { skip: !patientId });
  const [shareReport, { isLoading: sharing }] = useShareRapidCareReportMutation();
  const records = (data?.data || []) as EmergencyRecord[];
  const [selected, setSelected] = useState<EmergencyRecord | null>(null);

  async function handleShare(bookingId: string) {
    await shareReport(bookingId).unwrap();
    setSelected((s) => (s?.bookingId === bookingId ? { ...s, sharedWithDoctor: true } : s));
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          🚑 {t('dashboard.emergencyHistory', 'Emergency History')}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {t('dashboard.emergencyHistoryDesc', 'RapidCare ambulance trips linked to your account')}
        </p>
      </div>

      <RapidCareWidget />

      {isLoading && <p className="text-sm text-muted">{t('common.loading', 'Loading…')}</p>}

      {!isLoading && records.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            <Ambulance className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3">{t('dashboard.noEmergencyHistory', 'No emergency transport records yet')}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {records.map((r) => (
          <Card key={r._id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">
                    {new Date(r.dispatchTime || r.createdAt).toLocaleString()}
                  </p>
                  <p className="font-semibold text-foreground mt-1">
                    {r.pickupAddress} → {r.destinationHospital}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {r.vehicleType}
                    {r.driverName ? ` · ${r.driverName}` : ''}
                    {r.responseTimeMinutes != null ? ` · ${r.responseTimeMinutes} min` : ''}
                    {' · '}₹{r.fare}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[r.eventType] || 'bg-muted text-muted-foreground'}`}
                >
                  {STATUS_LABEL[r.eventType] || r.eventType}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setSelected(r)}>
                  View Report
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={r.sharedWithDoctor || sharing}
                  onClick={() => handleShare(r.bookingId)}
                >
                  {r.sharedWithDoctor ? 'Shared with doctor' : 'Share with Doctor'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-lg">{selected.bookingId}</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
              <DetailRow label="Patient" value={selected.patientName} />
              <DetailRow label="From" value={selected.pickupAddress} />
              <DetailRow label="To" value={selected.destinationHospital} />
              <DetailRow label="Condition" value={selected.condition} />
              <DetailRow
                label="Vehicle"
                value={`${selected.vehicleType}${selected.vehicleNumber ? ` · ${selected.vehicleNumber}` : ''}`}
              />
              {selected.driverName && <DetailRow label="Driver" value={selected.driverName} />}
              {selected.responseTimeMinutes != null && (
                <DetailRow label="Response time" value={`${selected.responseTimeMinutes} minutes`} />
              )}
              <DetailRow label="Fare" value={`₹${selected.fare} (${selected.paymentStatus})`} />
              {selected.dispatchTime && (
                <DetailRow label="Dispatch" value={new Date(selected.dispatchTime).toLocaleString()} />
              )}
              {selected.arrivalTime && (
                <DetailRow label="Arrival" value={new Date(selected.arrivalTime).toLocaleString()} />
              )}
              {selected.completedTime && (
                <DetailRow label="Completed" value={new Date(selected.completedTime).toLocaleString()} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}
