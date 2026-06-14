import { AlertTriangle, Pill } from 'lucide-react';
import { useGetPharmacyStaffInventoryQuery } from '@/features/api/apiSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Medicine } from '@/types';

export function PharmacyStaffInventoryPage() {
  const { data, isLoading } = useGetPharmacyStaffInventoryQuery();
  const medicines = (data?.data ?? []) as Medicine[];

  const lowStock = medicines.filter((m) => m.stock <= 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Inventory</h1>
        <p className="text-sm text-muted">Stock levels for your pharmacy catalog.</p>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-start gap-3 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>{lowStock.length} item{lowStock.length !== 1 ? 's' : ''} running low (≤10 units).</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="h-40 bg-border animate-pulse rounded-lg" />
      ) : medicines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            <Pill className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No medicines linked to this pharmacy yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Medicine</th>
                <th className="p-3 font-medium">Stock</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Rx</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => (
                <tr key={med._id} className="border-t border-border">
                  <td className="p-3">
                    <p className="font-medium">{med.name}</p>
                    <p className="text-xs text-muted">{med.genericName}</p>
                  </td>
                  <td className="p-3">
                    <Badge variant={med.stock <= 10 ? 'danger' : 'secondary'}>{med.stock}</Badge>
                  </td>
                  <td className="p-3">{formatCurrency(med.pricing.sellingPrice)}</td>
                  <td className="p-3">{med.prescriptionRequired ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
