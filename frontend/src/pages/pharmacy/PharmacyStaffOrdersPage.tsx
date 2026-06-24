import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Package, Truck } from 'lucide-react';
import {
  useGetPharmacyStaffOrdersQuery,
  useUpdatePharmacyStaffOrderStatusMutation,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiError';
import type { PharmacyOrder, User } from '@/types';

const NEXT_STATUS: Record<string, { label: string; next: string } | null> = {
  pending: { label: 'Confirm', next: 'confirmed' },
  confirmed: { label: 'Mark packed', next: 'packed' },
  packed: { label: 'Ship', next: 'shipped' },
  shipped: { label: 'Delivered', next: 'delivered' },
  delivered: null,
  cancelled: null,
};

function patientLabel(patientId: PharmacyOrder['patientId'] | string): string {
  if (!patientId || typeof patientId === 'string') return 'Patient';
  if ('profile' in patientId) {
    const u = patientId as User;
    return `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim() || u.phone;
  }
  return 'Patient';
}

export function PharmacyStaffOrdersPage() {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const { data, isLoading, refetch } = useGetPharmacyStaffOrdersQuery();
  const [updateStatus, { isLoading: updating }] = useUpdatePharmacyStaffOrderStatusMutation();

  const filtered = useMemo(() => {
    const orders = (data?.data ?? []) as PharmacyOrder[];
    if (filter === 'all') return orders;
    return orders.filter((o) => !['delivered', 'cancelled'].includes(o.delivery.currentStatus));
  }, [data?.data, filter]);

  const handleAdvance = async (orderId: string, next: string) => {
    try {
      await updateStatus({ id: orderId, status: next }).unwrap();
      toast.success(`Order marked ${next}`);
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update order'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Incoming orders</h1>
        <p className="text-sm text-muted">Confirm, pack, ship, and notify patients.</p>
      </div>

      <div className="flex gap-2">
        {(['active', 'all'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? 'Active' : 'All'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-40 bg-border animate-pulse rounded-lg" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No {filter === 'active' ? 'active ' : ''}orders right now.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => {
            const step = NEXT_STATUS[order.delivery.currentStatus];
            return (
              <li key={order._id}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">{order.orderId}</CardTitle>
                      <Badge variant="secondary">{order.delivery.currentStatus}</Badge>
                    </div>
                    <p className="text-sm text-muted">
                      {patientLabel(order.patientId ?? '')} · {formatCurrency(order.pricing.total)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="text-sm space-y-1">
                      {order.items.map((item, idx) => (
                        <li key={item.medicineId ?? `${item.medicineName}-${idx}`}>
                          {item.medicineName} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                    </p>
                    {step && (
                      <Button
                        size="sm"
                        disabled={updating}
                        onClick={() => handleAdvance(order._id, step.next)}
                      >
                        {step.label}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
