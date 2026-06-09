import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { removeFromCart, updateQuantity, selectCartTotal, clearCart } from '@/features/cart/cartSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export function CartPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const total = useAppSelector(selectCartTotal);
  const deliveryCharges = total > 500 ? 0 : 49;
  const tax = total * 0.05;
  const grandTotal = total + deliveryCharges + tax;

  if (items.length === 0) {
    return (
      <div className="container-custom py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-muted mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted mb-6">Add medicines from our pharmacy</p>
        <Link to="/pharmacy"><Button>Browse Pharmacy</Button></Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item._id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-16 w-16 bg-primary/5 rounded-lg flex items-center justify-center text-2xl">💊</div>
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-muted">{item.brand}</p>
                  <p className="font-semibold text-primary mt-1">{formatCurrency(item.pricing.sellingPrice)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity - 1 }))}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity + 1 }))}
                  >
                    +
                  </Button>
                </div>
                <Button size="icon" variant="ghost" onClick={() => dispatch(removeFromCart(item._id))}>
                  <Trash2 className="h-4 w-4 text-accent" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit sticky top-24">
          <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
            <div className="flex justify-between text-sm"><span>Delivery</span><span>{deliveryCharges === 0 ? 'FREE' : formatCurrency(deliveryCharges)}</span></div>
            <div className="flex justify-between text-sm"><span>Tax (5%)</span><span>{formatCurrency(tax)}</span></div>
            <div className="border-t border-border pt-3 flex justify-between font-bold">
              <span>Total</span><span>{formatCurrency(grandTotal)}</span>
            </div>
            <Button className="w-full" size="lg" asChild>
              <Link to="/checkout">Proceed to Checkout</Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => dispatch(clearCart())}>Clear Cart</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
