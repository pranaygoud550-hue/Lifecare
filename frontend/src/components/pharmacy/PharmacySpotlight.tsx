import { Link } from 'react-router-dom';
import { ArrowRight, Pill, ShoppingCart, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useAppSelector } from '@/hooks/redux';
import { selectCartCount } from '@/features/cart/cartSlice';
import { Badge } from '@/components/ui/badge';
import type { PharmacyOrder } from '@/types';

/** Featured dashboard card — pharmacy as its own flagship store */
export function PharmacySpotlight({ orders = [] }: { orders?: PharmacyOrder[] }) {
  const cartCount = useAppSelector(selectCartCount);
  const latestOrder = orders[0];
  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.delivery?.currentStatus || ''));

  return (
    <Link
      to="/pharmacy"
      className="group relative block overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-900 p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:bg-teal-400/25 transition-colors" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg">
          <Pill className="h-8 w-8" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-100 border border-emerald-400/30">
              <Sparkles className="h-3 w-3" />
              Featured store
            </span>
            <span className="text-[10px] font-semibold text-emerald-200/80 uppercase">LifeCare+ Pharmacy</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Your trusted online pharmacy
          </h2>
          <p className="text-sm text-white/70 max-w-xl leading-relaxed">
            Order genuine medicines, upload prescriptions, and track delivery — a dedicated store separate
            from appointments and vitals, with up to 40% off and free delivery above ₹500.
          </p>
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Licensed partners
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-emerald-300" /> Fast delivery
            </span>
            <span>·</span>
            <span>Rx upload</span>
          </div>
          {latestOrder && (
            <p className="text-xs text-emerald-200/90 mt-3">
              {activeOrders.length > 0
                ? `${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''} · latest: ${latestOrder.delivery?.currentStatus || 'pending'}`
                : `Last order delivered · ${latestOrder.orderId}`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-emerald-900 hover:bg-white/90 font-semibold shadow-md px-4 py-2.5 text-sm group-hover:gap-3 transition-all">
            Open pharmacy store
            <ArrowRight className="h-4 w-4" />
          </span>
          {cartCount > 0 && (
            <span className="inline-flex items-center justify-center gap-1.5 text-xs text-emerald-100 font-medium">
              <ShoppingCart className="h-3.5 w-3.5" />
              {cartCount} item{cartCount > 1 ? 's' : ''} in cart
            </span>
          )}
          {cartCount === 0 && (
            <Badge className="bg-emerald-500/30 text-emerald-50 border-emerald-400/40 justify-center">
              Browse medicines
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
