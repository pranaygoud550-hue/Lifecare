import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Star, Clock, Languages, Award, MapPin, GraduationCap,
  Video, Phone, MessageSquare, Home, Building2, ChevronLeft,
} from 'lucide-react';
import { useGetDoctorByIdQuery } from '@/features/api/apiSlice';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RatingBreakdown } from '@/components/doctor/RatingBreakdown';
import { DoctorAvailabilityPicker } from '@/components/doctor/DoctorAvailabilityPicker';
import { SimilarDoctors } from '@/components/doctor/SimilarDoctors';
import { VerifiedBadge } from '@/components/doctor/VerifiedBadge';
import { getInitials, formatCurrency, cn } from '@/lib/utils';
import { useAppSelector } from '@/hooks/redux';
import type { Review } from '@/types';

const consultationTypes = [
  { id: 'video', label: 'Video Consult', icon: Video },
  { id: 'audio', label: 'Audio Call', icon: Phone },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'homeVisit', label: 'Clinic / Home Visit', icon: Home },
];

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getReviewerName(review: Review) {
  const by = review.reviewedBy;
  if (typeof by === 'object' && by?.profile) {
    return `${by.profile.firstName} ${by.profile.lastName}`;
  }
  return 'Patient';
}

export function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetDoctorByIdQuery(id!);

  const [selectedType, setSelectedType] = useState('video');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  if (isLoading) {
    return (
      <div className="container-custom py-8 space-y-6">
        <div className="h-48 bg-border rounded-2xl animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-border rounded-2xl animate-pulse" />
          <div className="h-96 bg-border rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const doctor = data?.data?.doctor;
  const reviews = (data?.data?.reviews || []) as Review[];
  const ratingBreakdown = data?.data?.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const ratingTotal = data?.data?.ratingTotal ?? reviews.length;
  const similarDoctors = data?.data?.similarDoctors || [];

  if (!doctor) {
    return (
      <div className="container-custom py-16 text-center">
        <p className="text-lg text-muted">Doctor not found</p>
        <Link to="/doctors"><Button className="mt-4">Browse Doctors</Button></Link>
      </div>
    );
  }

  const { profile, doctorDetails } = doctor;
  const clinic = doctorDetails.clinic;
  const coords = clinic?.coordinates || { lat: 19.076, lng: 72.8777 };
  const mapQuery = encodeURIComponent(
    clinic?.address || `${clinic?.name || ''} ${clinic?.city || profile.address?.city || 'India'}`
  );
  const mapEmbedUrl = `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`;

  const handleBook = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const params = new URLSearchParams({ type: selectedType });
    if (selectedDate) params.set('date', selectedDate);
    if (selectedTime) params.set('time', selectedTime);
    navigate(`/doctors/${id}/book?${params.toString()}`);
  };

  const handleSlotSelect = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const avgRating = doctorDetails.rating ?? 4.5;
  const primaryFee =
    doctorDetails.consultationFees?.[selectedType as keyof typeof doctorDetails.consultationFees] ??
    doctorDetails.consultationFees?.video ??
    500;

  return (
    <div className="bg-background min-h-screen pb-16">
      {/* Header banner */}
      <div className="bg-gradient-to-br from-primary/10 via-white to-secondary/5 border-b border-border">
        <div className="container-custom py-6">
          <Link
            to="/doctors"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-4"
          >
            <ChevronLeft className="h-4 w-4" /> Back to doctors
          </Link>

          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-28 w-28 md:h-32 md:w-32 ring-4 ring-white shadow-lg shrink-0">
              <AvatarImage src={profile.profilePhoto} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                {getInitials(profile.firstName, profile.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
                  Dr. {profile.firstName} {profile.lastName}
                  <VerifiedBadge verified={doctorDetails.verified} size="lg" showLabel />
                </h1>
              </div>

              <p className="text-primary font-semibold text-lg">
                {doctorDetails.specializations?.join(' · ')}
              </p>
              <p className="text-muted mt-1">
                {doctorDetails.qualifications?.join(' · ')}
              </p>

              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)} ({doctorDetails.reviewCount || ratingTotal} reviews)
                </span>
                <span className="flex items-center gap-1 text-muted">
                  <Clock className="h-4 w-4" />
                  {doctorDetails.experience}+ years experience
                </span>
                {doctorDetails.languages?.length ? (
                  <span className="flex items-center gap-1 text-muted">
                    <Languages className="h-4 w-4" />
                    {doctorDetails.languages.join(', ')}
                  </span>
                ) : null}
              </div>

              {doctor.nextAvailableSlot && (
                <p className="mt-3 text-sm font-medium text-secondary bg-secondary/10 inline-flex px-3 py-1 rounded-full">
                  Next available: {doctor.nextAvailableSlot.label}
                </p>
              )}
            </div>

            <div className="md:text-right shrink-0">
              <p className="text-sm text-muted">Consultation fee</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(primaryFee)}</p>
              <Button className="mt-3 w-full md:w-auto" size="lg" onClick={handleBook}>
                Book appointment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader><CardTitle>About the doctor</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted leading-relaxed">
                  {doctorDetails.bio || 'Experienced healthcare professional dedicated to comprehensive patient care.'}
                </p>
                {doctorDetails.registrationNumber && (
                  <p className="text-xs text-muted mt-3">
                    Registration: {doctorDetails.registrationNumber}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Clinic & map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Clinic location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold text-lg">{clinic?.name || doctorDetails.hospitalAffiliations?.[0]}</p>
                  <p className="text-muted text-sm mt-1 flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <span>
                      {clinic?.address ||
                        `${doctorDetails.hospitalAffiliations?.[0] || ''}, ${profile.address?.city || ''}`}
                      {clinic?.pincode ? ` — ${clinic.pincode}` : ''}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl overflow-hidden border border-border h-64 bg-muted">
                  <iframe
                    title="Clinic location map"
                    src={mapEmbedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Open in Google Maps →
                </a>
                {doctorDetails.hospitalAffiliations && doctorDetails.hospitalAffiliations.length > 1 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium mb-2">Also affiliated with</p>
                    <ul className="text-sm text-muted space-y-1">
                      {doctorDetails.hospitalAffiliations.slice(1).map((h) => (
                        <li key={h}>• {h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Education & training
                </CardTitle>
              </CardHeader>
              <CardContent>
                {doctorDetails.education?.length ? (
                  <div className="relative border-l-2 border-primary/20 ml-3 space-y-6 pl-6">
                    {doctorDetails.education.map((edu, i) => (
                      <div key={i} className="relative">
                        <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-white" />
                        <p className="font-semibold">{edu.degree}</p>
                        <p className="text-sm text-muted">{edu.institution}</p>
                        {edu.year && <p className="text-xs text-muted mt-0.5">{edu.year}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    {doctorDetails.qualifications?.join(' · ')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Awards */}
            {doctorDetails.awards?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Awards & achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {doctorDetails.awards.map((award) => (
                      <li
                        key={award}
                        className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50 border border-amber-100"
                      >
                        <Award className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{award}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Patient reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <RatingBreakdown
                  breakdown={ratingBreakdown}
                  total={ratingTotal}
                  averageRating={avgRating}
                />

                <div className="border-t border-border pt-6 space-y-6">
                  {reviews.length === 0 ? (
                    <p className="text-muted text-sm text-center py-6">No reviews yet. Be the first to review!</p>
                  ) : (
                    reviews.map((review) => (
                      <div key={review._id} className="border-b border-border pb-6 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="text-xs bg-primary/5">
                                {getInitials(
                                  typeof review.reviewedBy === 'object'
                                    ? review.reviewedBy.profile?.firstName
                                    : 'P',
                                  typeof review.reviewedBy === 'object'
                                    ? review.reviewedBy.profile?.lastName
                                    : 't'
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{getReviewerName(review)}</p>
                              <p className="text-xs text-muted">
                                {review.createdAt ? formatReviewDate(review.createdAt) : ''}
                                {review.isVerified && (
                                  <span className="ml-2 text-secondary">Verified visit</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'h-3.5 w-3.5',
                                  i <= review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-border'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        {review.review && (
                          <p className="text-sm text-muted mt-3 leading-relaxed">{review.review}</p>
                        )}
                        {review.response?.message && (
                          <div className="mt-3 ml-4 pl-4 border-l-2 border-primary/30 bg-primary/5 p-3 rounded-lg">
                            <p className="text-xs font-medium text-primary mb-1">Doctor&apos;s response</p>
                            <p className="text-sm text-muted">{review.response.message}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — booking */}
          <div className="space-y-6">
            <Card className="lg:sticky lg:top-24 shadow-lg border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle>Book consultation</CardTitle>
                <p className="text-sm text-muted">Select type, date & time</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Consultation type</p>
                  {consultationTypes.map((type) => {
                    const fee =
                      doctorDetails.consultationFees?.[
                        type.id as keyof typeof doctorDetails.consultationFees
                      ];
                    const available = doctorDetails.consultationTypes?.includes(type.id);
                    if (!available) return null;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left',
                          selectedType === type.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/40'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{type.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(fee || 0)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <DoctorAvailabilityPicker
                  doctorId={id!}
                  onSlotSelect={handleSlotSelect}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                />

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBook}
                  disabled={!selectedDate || !selectedTime}
                >
                  {selectedDate && selectedTime
                    ? `Book at ${selectedTime}`
                    : 'Select date & time to continue'}
                </Button>
                {(!selectedDate || !selectedTime) && (
                  <p className="text-xs text-center text-muted">
                    Or{' '}
                    <button type="button" className="text-primary hover:underline" onClick={handleBook}>
                      skip to booking form
                    </button>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <SimilarDoctors
          doctors={similarDoctors}
          specialization={doctorDetails.specializations?.[0]}
        />
      </div>
    </div>
  );
}
