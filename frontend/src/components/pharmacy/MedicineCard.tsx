import { Plus, Minus, Pill, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import type { Medicine } from '@/types';

function getFormEmoji(form?: string) {
  switch (form?.toLowerCase()) {
    case 'syrup':
      return '🧴';
    case 'injection':
      return '💉';
    case 'sachet':
      return '📦';
    case 'capsule':
      return '💊';
    case 'liquid':
      return '🧴';
    default:
      return '💊';
  }
}

export function getStockStatus(stock: number) {
  if (stock <= 0) return { label: 'Out of stock', variant: 'danger' as const, canAdd: false };
  if (stock <= 10) return { label: `Only ${stock} left`, variant: 'warning' as const, canAdd: true };
  return { label: 'In stock', variant: 'success' as const, canAdd: true };
}

interface MedicineCardProps {
  medicine: Medicine;
  quantity: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

export function MedicineCard({ medicine, quantity, onAdd, onIncrease, onDecrease }: MedicineCardProps) {
  const discount =
    medicine.pricing.discount ??
    Math.round(
      ((medicine.pricing.mrp - medicine.pricing.sellingPrice) / medicine.pricing.mrp) * 100
    );
  const stock = getStockStatus(medicine.stock);
  const manufacturer = medicine.manufacturer || medicine.brand || '—';

  return (
    <Card className="group h-full flex flex-col overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-0 flex flex-col flex-1">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center border-b border-border">
          <span className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-200">
            {getFormEmoji(medicine.form)}
          </span>
          {discount > 0 && (
            <Badge variant="success" className="absolute top-2 left-2 text-xs">
              {discount}% OFF
            </Badge>
          )}
          {medicine.prescriptionRequired && (
            <Badge variant="warning" className="absolute top-2 right-2 text-xs gap-0.5">
              <AlertCircle className="h-3 w-3" /> Rx
            </Badge>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-sm line-clamp-2 leading-snug mb-1">{medicine.name}</h3>
          {medicine.genericName && (
            <p className="text-xs text-muted line-clamp-1 mb-1">
              <span className="text-foreground/70">Generic:</span> {medicine.genericName}
            </p>
          )}
          <p className="text-xs text-muted line-clamp-1 mb-2 flex items-center gap-1">
            <Pill className="h-3 w-3 shrink-0" />
            {manufacturer}
          </p>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-primary">
              {formatCurrency(medicine.pricing.sellingPrice)}
            </span>
            {medicine.pricing.mrp > medicine.pricing.sellingPrice && (
              <span className="text-xs text-muted line-through">
                {formatCurrency(medicine.pricing.mrp)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mb-3 mt-auto">
            <Badge variant={stock.variant} className="text-xs font-normal">
              {stock.label}
            </Badge>
            {medicine.form && (
              <span className="text-xs text-muted capitalize">{medicine.form}</span>
            )}
          </div>

          {quantity === 0 ? (
            <Button
              size="sm"
              className="w-full"
              onClick={onAdd}
              disabled={!stock.canAdd}
            >
              {stock.canAdd ? 'Add to cart' : 'Unavailable'}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-3 border border-border rounded-lg py-1.5">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={onDecrease}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-semibold min-w-[1.5rem] text-center">{quantity}</span>
              <Button
                size="icon"
                variant="outline"
                className={cn('h-8 w-8', !stock.canAdd && 'opacity-50')}
                onClick={onIncrease}
                disabled={!stock.canAdd}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
