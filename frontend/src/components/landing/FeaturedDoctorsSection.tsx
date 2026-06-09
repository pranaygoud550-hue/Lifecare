import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { useGetFeaturedDoctorsQuery } from '@/features/api/apiSlice';
import { DoctorCard } from '@/components/doctor/DoctorCard';
import { Button } from '@/components/ui/button';
import type { Doctor } from '@/types';

export function FeaturedDoctorsSection() {
  const { data, isLoading } = useGetFeaturedDoctorsQuery();
  const doctors = (data?.data || []) as Doctor[];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-white to-background">
      <div className="container-custom">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Star className="h-5 w-5 fill-amber-400" />
              <span className="text-sm font-semibold text-muted">Top rated specialists</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">Featured doctors</h2>
            <p className="text-muted mt-2">Book instantly · Video consult from ₹299</p>
          </div>
          <Link to="/doctors">
            <Button variant="outline" className="gap-2 rounded-full">
              View all doctors <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-border animate-pulse" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
            <p className="text-muted mb-4">Featured doctors will appear once the database is seeded.</p>
            <Link to="/doctors">
              <Button>Browse all doctors</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.slice(0, 4).map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
