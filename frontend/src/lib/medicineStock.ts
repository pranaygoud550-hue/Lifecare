export function getStockStatus(stock: number) {
  if (stock <= 0) return { label: 'Out of stock', variant: 'danger' as const, canAdd: false };
  if (stock <= 10) return { label: `Only ${stock} left`, variant: 'warning' as const, canAdd: true };
  return { label: 'In stock', variant: 'success' as const, canAdd: true };
}
