import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useGetSpecialtiesQuery } from '@/features/api/apiSlice';
import { getSpecialtyIcon, getSpecialtyColor } from '@/lib/specialtyIcons';

const FALLBACK = [
  'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics',
  'Neurology', 'Gynecology', 'Psychiatry', 'General Physician',
  'ENT', 'Ophthalmology', 'Urology', 'Oncology',
];

export function SpecializationsSection() {
  const { data, isLoading } = useGetSpecialtiesQuery();
  const specialties = data?.data?.length ? data.data : FALLBACK;

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container-custom">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-2">Specializations</p>
            <h2 className="text-3xl md:text-4xl font-bold">Consult top doctors across specialties</h2>
            <p className="text-muted mt-2 max-w-xl">
              From heart care to skin health — book verified specialists in your city.
            </p>
          </div>
          <Link
            to="/doctors"
            className="inline-flex items-center gap-1 text-primary font-semibold text-sm hover:underline shrink-0"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {specialties.map((name) => {
              const Icon = getSpecialtyIcon(name);
              const colorClass = getSpecialtyColor(name);
              return (
                <Link
                  key={name}
                  to={`/doctors?specialty=${encodeURIComponent(name)}`}
                  className={`group flex flex-col items-center p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${colorClass}`}
                >
                  <div className="p-3 rounded-xl bg-white/80 mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="text-sm font-semibold text-center leading-tight">{name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
