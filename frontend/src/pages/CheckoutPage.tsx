import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Wallet, MapPin, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { clearCart, selectCartTotal } from '@/features/cart/cartSlice';
import {
  useCreatePharmacyOrderMutation,
  useGetProfileQuery,
  useGetWalletQuery,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiError';

export function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const subtotal = useAppSelector(selectCartTotal);
  const deliveryCharges = subtotal > 500 ? 0 : 49;
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + deliveryCharges + tax;

  const { data: profileData } = useGetProfileQuery();
  const { data: walletData } = useGetWalletQuery();
  const [createOrder, { isLoading }] = useCreatePharmacyOrderMutation();

  const profile = profileData?.data;
  const walletBalance = walletData?.data?.balance ?? 0;

  const [address, setAddress] = useState({
    name: profile ? `${profile.profile.firstName} ${profile.profile.lastName}` : '',
    phone: profile?.phone || '',
    street: profile?.profile.address?.street || '',
    city: profile?.profile.address?.city || 'Mumbai',
    state: profile?.profile.address?.state || 'Maharashtra',
    pincode: profile?.profile.address?.pincode || '400001',
  });

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (walletBalance < grandTotal) {
      toast.error(`Insufficient wallet balance. Need ${formatCurrency(grandTotal)}, have ${formatCurrency(walletBalance)}`);
      navigate('/wallet');
      return;
    }

    try {
      const result = await createOrder({
        items: items.map((item) => ({ medicineId: item._id, quantity: item.quantity })),
        deliveryAddress: address,
        deliveryType: 'standard',
        paymentMethod: 'wallet',
      }).unwrap();

      dispatch(clearCart());
      toast.success('Order placed successfully!');
      navigate(`/pharmacy/orders/${result.data._id}`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not place order'));
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-custom py-16 text-center">
        <p className="text-muted mb-4">Nothing to checkout</p>
        <Link to="/pharmacy"><Button>Browse Pharmacy</Button></Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Delivery address
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Name</Label>
              <Input value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} required />
            </div>
            <div>
              <Label>Pincode</Label>
              <Input value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <Label>Street</Label>
              <Input value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required />
            </div>
            <div>
              <Label>City</Label>
              <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
            </div>
            <div>
              <Label>State</Label>
              <Input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Pay from wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({items.length} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery</span>
              <span>{deliveryCharges === 0 ? 'FREE' : formatCurrency(deliveryCharges)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (5%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <p className="text-sm text-muted">
              Wallet balance: <strong>{formatCurrency(walletBalance)}</strong>
            </p>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Placing order…
                </>
              ) : (
                `Pay ${formatCurrency(grandTotal)} from wallet`
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
