import { Search, ShoppingCart, SlidersHorizontal, Package } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Link, useSearchParams } from 'react-router-dom';
import { useGetMedicinesQuery } from '@/features/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { addToCart, updateQuantity, selectCartCount } from '@/features/cart/cartSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MedicineCard } from '@/components/pharmacy/MedicineCard';
import { UploadPrescriptionBanner } from '@/components/pharmacy/UploadPrescriptionBanner';
import { cn } from '@/lib/utils';
import type { Medicine } from '@/types';

const FORM_FILTERS = [
  { id: '', label: 'All' },
  { id: 'Tablet', label: 'Tablets' },
  { id: 'Capsule', label: 'Capsules' },
  { id: 'Syrup', label: 'Syrups' },
  { id: 'Injection', label: 'Injections' },
  { id: 'Sachet', label: 'Vitamins & Sachets' },
  { id: 'Liquid', label: 'Liquids & Care' },
] as const;

const SORT_OPTIONS = [
  { value: 'name', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'discount', label: 'Discount: High to Low' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

function parseSort(value: SortValue): { sort: string; order?: string } {
  if (value === 'price-asc') return { sort: 'price', order: 'asc' };
  if (value === 'price-desc') return { sort: 'price', order: 'desc' };
  if (value === 'discount') return { sort: 'discount', order: 'desc' };
  return { sort: 'name' };
}

export function PharmacyPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);
  const [formFilter, setFormFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortValue>('name');
  const dispatch = useAppDispatch();
  const cartCount = useAppSelector(selectCartCount);
  const cartItems = useAppSelector((state) => state.cart.items);

  const sortParams = parseSort(sortBy);

  const { data, isLoading, isFetching } = useGetMedicinesQuery({
    search: search.trim() || undefined,
    form: formFilter || undefined,
    sort: sortParams.sort,
    order: sortParams.order,
    limit: '48',
  });

  const medicines = data?.data?.medicines || [];
  const total = (data?.data?.pagination as { total?: number })?.total ?? medicines.length;

  const rxCount = useMemo(
    () => medicines.filter((m) => m.prescriptionRequired).length,
    [medicines]
  );

  const handleAddToCart = (medicine: Medicine) => {
    if (medicine.stock <= 0) {
      toast.error(`${medicine.name} is out of stock`);
      return;
    }
    dispatch(addToCart({ medicine }));
    toast.success(`${medicine.name} added to cart`);
  };

  const getCartQuantity = (id: string) => cartItems.find((i) => i._id === id)?.quantity || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero strip */}
      <div className="bg-gradient-to-b from-primary/8 to-background border-b border-border">
        <div className="container-custom py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-6 w-6 text-primary" />
                <Badge variant="secondary">Licensed partners</Badge>
                <Badge className="bg-emerald-600/90 text-white border-0">Featured store</Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">LifeCare+ Pharmacy</h1>
              <p className="text-muted mt-2 max-w-xl">
                Genuine medicines · Up to 40% off · Free delivery on orders above ₹500
              </p>
            </div>
            <Link to="/cart">
              <Button size="lg" variant="outline" className="gap-2 shadow-sm">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cartCount})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <UploadPrescriptionBanner />

        {/* Search + sort */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <Input
              placeholder="Search by name, generic, or manufacturer..."
              className="pl-10 h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="h-4 w-4 text-muted hidden sm:block" />
            <select
              className="h-11 rounded-lg border border-border bg-card px-3 text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortValue)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-thin">
          {FORM_FILTERS.map((cat) => (
            <button
              key={cat.id || 'all'}
              type="button"
              onClick={() => setFormFilter(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors',
                formFilter === cat.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card border-border text-muted hover:border-primary/50 hover:text-foreground'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-muted">
          <span>
            {isFetching && !isLoading ? 'Updating...' : `${total} product${total !== 1 ? 's' : ''}`}
          </span>
          {rxCount > 0 && (
            <Badge variant="warning" className="font-normal">
              {rxCount} require prescription
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border">
            <Package className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="font-medium text-lg">No medicines found</p>
            <p className="text-muted text-sm mt-1">Try a different search or category</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearch('');
                setFormFilter('');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {medicines.map((medicine) => {
              const qty = getCartQuantity(medicine._id);
              return (
                <MedicineCard
                  key={medicine._id}
                  medicine={medicine}
                  quantity={qty}
                  onAdd={() => handleAddToCart(medicine)}
                  onIncrease={() => dispatch(addToCart({ medicine }))}
                  onDecrease={() =>
                    dispatch(updateQuantity({ id: medicine._id, quantity: qty - 1 }))
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
