import { Building2 } from 'lucide-react';
import { useGetHospitalsQuery } from '@/features/api/apiSlice';
import { HospitalCard } from '@/components/hospital/HospitalCard';

interface HospitalsSectionProps {
  city: string;
  search?: string;
  title?: string;
}

export function HospitalsSection({ city, search, title }: HospitalsSectionProps) {
  const { data, isLoading } = useGetHospitalsQuery({
    city,
    search: search || undefined,
    limit: '6',
  });

  const hospitals = data?.data?.hospitals || [];
  const total = data?.data?.pagination?.total || hospitals.length;

  if (!city) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">
          {title || `Hospitals in ${city}`}
        </h2>
        {!isLoading && (
          <span className="text-sm text-muted">({total} found)</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : hospitals.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center bg-card rounded-lg border border-border">
          No hospitals found in {city}{search ? ` matching "${search}"` : ''}.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map((hospital) => (
            <HospitalCard key={hospital._id} hospital={hospital} />
          ))}
        </div>
      )}
    </section>
  );
}
