import { Link } from 'react-router-dom';
import { useGetFeaturedDoctorsQuery, useGetSpecialtiesQuery, useGetPlatformStatsQuery } from '@/features/api/apiSlice';
import { DoctorCard } from '@/components/doctor/DoctorCard';
import { Button } from '@/components/ui/button';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Doctor } from '@/types';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Patient',
    content: 'LifeCare+ saved my father during a cardiac emergency. The ambulance arrived in 7 minutes!',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Patient',
    content: 'Video consultation was seamless. Got my prescription within minutes of the call.',
    rating: 5,
  },
  {
    name: 'Emily Davis',
    role: 'Patient',
    content: 'Medicine delivery is super fast. Ordered at night, received next morning.',
    rating: 5,
  },
];

export function FeaturedDoctors() {
  const { data, isLoading } = useGetFeaturedDoctorsQuery();

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container-custom">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-border rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const doctors = data?.data || [];

  return (
    <section className="py-16 bg-background">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured Doctors</h2>
            <p className="text-muted">Top-rated specialists ready to help you</p>
          </div>
          <Link to="/doctors">
            <Button variant="outline">View All Doctors</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor._id} doctor={doctor as Doctor} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SpecialtiesGrid() {
  const { data } = useGetSpecialtiesQuery();
  const specialties = data?.data || [];

  return (
    <section className="py-16 bg-card">
      <div className="container-custom">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Medical Specialties</h2>
          <p className="text-muted">Find specialists across 12+ medical fields</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {specialties.map((specialty) => (
            <Link
              key={specialty}
              to={`/doctors?specialty=${encodeURIComponent(specialty)}`}
              className="p-4 rounded-lg border border-border bg-background hover:border-primary hover:shadow-md transition-all text-center"
            >
              <span className="text-sm font-medium">{specialty}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-16">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">What Our Patients Say</h2>
          <p className="text-muted">Real stories from people we've helped</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <Card key={t.name} className="relative">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted mb-4 italic">"{t.content}"</p>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const { data } = useGetPlatformStatsQuery();
  const stats = data?.data;

  const items = [
    { label: 'Active Doctors', value: stats?.activeDoctors || '10,000+' },
    { label: 'Completed Appointments', value: stats?.completedAppointments || '500K+' },
    { label: 'Happy Patients', value: stats?.happyPatients || '1M+' },
    { label: 'Lives Saved', value: stats?.livesSaved || '50K+' },
  ];

  return (
    <section className="py-16 bg-primary text-white">
      <div className="container-custom">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {items.map((item) => (
            <div key={item.label}>
              <p className="text-3xl md:text-4xl font-bold mb-2">{item.value}</p>
              <p className="text-sm opacity-80">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
