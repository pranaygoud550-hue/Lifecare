import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CitySearchInput } from '@/components/search/CitySearchInput';

export function HeroSection() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    navigate(`/doctors?${params.toString()}`);
  };

  return (
    <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,102,255,0.08),transparent_50%)]" />
      <div className="container-custom relative">
        <div className="max-w-3xl mx-auto text-center">
          <Badge className="mb-4">Trusted by 1M+ patients nationwide</Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Healthcare at Your{' '}
            <span className="text-primary">Doorstep</span>
          </h1>
          <p className="text-lg text-muted mb-8 max-w-2xl mx-auto">
            24/7 Emergency & Consultation Services. Connect with verified doctors,
            find hospitals in your city, and request ambulances — all from home.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted z-10" />
              <Input
                placeholder="Search doctors, specialties, hospitals..."
                className="pl-10 h-12"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <CitySearchInput
              value={city}
              onChange={(c) => setCity(c)}
              placeholder="Search city..."
              inputClassName="h-12"
              className="flex-1"
            />
            <Button type="submit" size="lg" className="h-12 px-8">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/doctors">
              <Button variant="default" size="lg">Find a Doctor</Button>
            </Link>
            <Link to="/pharmacy">
              <Button variant="secondary" size="lg">Order Medicines</Button>
            </Link>
            <Link to="/ambulance">
              <Button variant="danger" size="lg">Emergency Ambulance</Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-12 text-sm text-muted">
            <div><span className="font-bold text-foreground text-lg">10,000+</span><br />Verified Doctors</div>
            <div><span className="font-bold text-foreground text-lg">24/7</span><br />Available</div>
            <div><span className="font-bold text-foreground text-lg">1M+</span><br />Lives Saved</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium ${className}`}>
      {children}
    </span>
  );
}
