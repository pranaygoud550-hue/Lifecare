import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ambulance, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useGetEmergencyHistoryQuery,
  useGetEmergencyRecordQuery,
} from '@/features/api/apiSlice';
import { LifeCareAmbulanceCard } from '@/components/dashboard/LifeCareAmbulanceCard';

type EmergencyRecord = {
  _id: string;
  bookingId: string;
  patientName: string;
  destinationHospital: string;
  vehicleType: string;
  dispatchTime?: string;
  responseTimeMinutes?: number;
  pickupAddress: string;
  condition: string;
  driverName?: string;
  vehicleNumber?: string;
  fare: number;
  paymentStatus: string;
  arrivalTime?: string;
  createdAt: string;
};

export function EmergencyHistorySection() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetEmergencyHistoryQuery();
  const records = (data?.data || []) as EmergencyRecord[];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detailData } = useGetEmergencyRecordQuery(selectedId || '', { skip: !selectedId });
  const detail = detailData?.data as EmergencyRecord | undefined;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {t('dashboard.emergencyHistory', 'Emergency History')}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {t('dashboard.emergencyHistoryDesc', 'Ambulance and hospital transport trips on your account')}
        </p>
      </div>

      <LifeCareAmbulanceCard />

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
            <button
              type="button"
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30"
              onClick={() => setSelectedId(r.bookingId)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Ambulance className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{r.vehicleType} → {r.destinationHospital}</p>
                <p className="text-xs text-muted">
                  {new Date(r.dispatchTime || r.createdAt).toLocaleString()}
                  {r.responseTimeMinutes != null ? ` · ${r.responseTimeMinutes} min response` : ''}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </button>
          </Card>
        ))}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-lg">{detail.bookingId}</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
              </div>
              <DetailRow label="Patient" value={detail.patientName} />
              <DetailRow label="Pickup" value={detail.pickupAddress} />
              <DetailRow label="Hospital" value={detail.destinationHospital} />
              <DetailRow label="Condition" value={detail.condition} />
              <DetailRow
                label="Vehicle"
                value={`${detail.vehicleType}${detail.vehicleNumber ? ` · ${detail.vehicleNumber}` : ''}`}
              />
              {detail.driverName && <DetailRow label="Driver" value={detail.driverName} />}
              {detail.responseTimeMinutes != null && (
                <DetailRow label="Response time" value={`${detail.responseTimeMinutes} minutes`} />
              )}
              <DetailRow label="Fare" value={`₹${detail.fare} (${detail.paymentStatus})`} />
              {detail.dispatchTime && (
                <DetailRow label="Dispatch" value={new Date(detail.dispatchTime).toLocaleString()} />
              )}
              {detail.arrivalTime && (
                <DetailRow label="Arrival" value={new Date(detail.arrivalTime).toLocaleString()} />
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
