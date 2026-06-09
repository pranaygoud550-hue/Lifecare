import { Link, useParams } from 'react-router-dom';
import { Package, CheckCircle2, Truck } from 'lucide-react';
import { useGetPharmacyOrderByIdQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'] as const;

function statusIndex(status: string) {
  const idx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
  return idx >= 0 ? idx : status === 'cancelled' ? -1 : 1;
}

export function PharmacyOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useGetPharmacyOrderByIdQuery(id!, { skip: !id });

  const order = data?.data;

  if (isLoading) {
    return <div className="container-custom py-16 text-center text-muted">Loading order…</div>;
  }

  if (isError || !order) {
    return (
      <div className="container-custom py-16 text-center">
        <p className="mb-4">Order not found</p>
        <Link to="/pharmacy"><Button>Browse Pharmacy</Button></Link>
      </div>
    );
  }

  const currentIdx = statusIndex(order.delivery.currentStatus);
  const isPaid = order.payment?.status === 'paid';

  return (
    <div className="container-custom py-8 max-w-2xl">
      <div className="text-center mb-8">
        {isPaid && (
          <CheckCircle2 className="h-14 w-14 text-secondary mx-auto mb-3" />
        )}
        <h1 className="text-3xl font-bold mb-2">
          {isPaid ? 'Order confirmed!' : 'Order placed'}
        </h1>
        <p className="text-muted">Order ID: {order.orderId}</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Delivery status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            {['Confirmed', 'Packed', 'Shipped', 'Delivered'].map((label, i) => {
              const active = currentIdx >= i + 1 || (i === 0 && currentIdx >= 0 && order.delivery.currentStatus !== 'cancelled');
              return (
                <div key={label} className="flex flex-col items-center flex-1">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      active ? 'bg-secondary text-white' : 'bg-border text-muted'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs mt-1 text-center">{label}</span>
                </div>
              );
            })}
          </div>
          <Badge variant={order.delivery.currentStatus === 'cancelled' ? 'danger' : 'secondary'}>
            {order.delivery.currentStatus}
          </Badge>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.medicineName} × {item.quantity}</span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between font-bold">
            <span>Total paid</span>
            <span>{formatCurrency(order.pricing.total)}</span>
          </div>
          <p className="text-xs text-muted">Placed on {formatDate(order.createdAt)}</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link to="/pharmacy" className="flex-1">
          <Button variant="outline" className="w-full">Continue shopping</Button>
        </Link>
        <Link to="/dashboard" className="flex-1">
          <Button className="w-full">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
