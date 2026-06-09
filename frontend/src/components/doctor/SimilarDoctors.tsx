import { Link } from 'react-router-dom';
import { DoctorCard } from '@/components/doctor/DoctorCard';
import type { Doctor } from '@/types';

interface SimilarDoctorsProps {
  doctors: Doctor[];
  specialization?: string;
}

export function SimilarDoctors({ doctors, specialization }: SimilarDoctorsProps) {
  if (!doctors.length) return null;

  return (
    <section className="mt-12 pt-10 border-t border-border">
      <h2 className="text-2xl font-bold mb-2">Similar doctors</h2>
      <p className="text-muted text-sm mb-6">
        Other {specialization ? `${specialization} specialists` : 'doctors'} you may want to consider
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {doctors.map((d) => (
          <DoctorCard key={d._id} doctor={d} variant="grid" />
        ))}
      </div>
      <div className="text-center mt-6">
        <Link to="/doctors" className="text-primary font-medium text-sm hover:underline">
          View all doctors →
        </Link>
      </div>
    </section>
  );
}
