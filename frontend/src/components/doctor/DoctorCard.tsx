import { Link } from 'react-router-dom';
import { Star, Clock, MapPin, Award, Languages } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getInitials, formatCurrency, cn } from '@/lib/utils';
import { VerifiedBadge } from '@/components/doctor/VerifiedBadge';
import type { Doctor } from '@/types';

interface DoctorCardProps {
  doctor: Doctor;
  variant?: 'grid' | 'list';
}

export function DoctorCard({ doctor, variant = 'grid' }: DoctorCardProps) {
  const { profile, doctorDetails } = doctor;
  const fee =
    doctor.displayFee ??
    doctorDetails.consultationFees?.video ??
    doctorDetails.consultationFees?.audio ??
    500;
  const qualifications = doctorDetails.qualifications?.slice(0, 2).join(', ') || 'MBBS';
  const languages = doctorDetails.languages?.slice(0, 2).join(', ');
  const nextSlot = doctor.nextAvailableSlot;

  if (variant === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <Avatar className="h-20 w-20 shrink-0 border-2 border-primary/10">
              <AvatarImage src={profile.profilePhoto} />
              <AvatarFallback className="text-lg bg-primary/5 text-primary">
                {getInitials(profile.firstName, profile.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-1">
                    Dr. {profile.firstName} {profile.lastName}
                    <VerifiedBadge verified={doctorDetails.verified} size="sm" />
                  </h3>
                  <p className="text-sm text-primary font-medium">
                    {doctorDetails.specializations?.join(', ')}
                  </p>
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <Award className="h-3 w-3" /> {qualifications}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{formatCurrency(fee)}</p>
                  <p className="text-xs text-muted">consultation fee</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {doctorDetails.rating?.toFixed(1) || '4.5'}
                </span>
                <span className="text-muted">({doctorDetails.reviewCount || 0} reviews)</span>
                <Badge variant="secondary">{doctorDetails.experience}+ yrs</Badge>
                {profile.address?.city && (
                  <span className="text-muted flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.address.city}
                  </span>
                )}
                {languages && (
                  <span className="text-muted flex items-center gap-1">
                    <Languages className="h-3 w-3" /> {languages}
                  </span>
                )}
              </div>

              {nextSlot && (
                <p className={cn(
                  'mt-2 text-sm font-medium flex items-center gap-1',
                  nextSlot.label.startsWith('Today') ? 'text-secondary' : 'text-muted'
                )}>
                  <Clock className="h-4 w-4" />
                  Next slot: {nextSlot.label}
                </p>
              )}
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0 sm:w-36">
              <Link to={`/doctors/${doctor._id}/book`} className="flex-1 sm:flex-none">
                <Button className="w-full" size="sm">Book Now</Button>
              </Link>
              <Link to={`/doctors/${doctor._id}`} className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full" size="sm">View Profile</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all overflow-hidden h-full flex flex-col group">
      <CardContent className="p-0 flex flex-col flex-1">
        <div className="p-5 flex-1">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 shrink-0 ring-2 ring-primary/10">
              <AvatarImage src={profile.profilePhoto} />
              <AvatarFallback className="bg-primary/5 text-primary font-semibold">
                {getInitials(profile.firstName, profile.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate group-hover:text-primary transition-colors flex items-center gap-1">
                <span className="truncate">Dr. {profile.firstName} {profile.lastName}</span>
                <VerifiedBadge verified={doctorDetails.verified} size="sm" />
              </h3>
              <p className="text-sm text-primary/90 font-medium truncate">
                {doctorDetails.specializations?.[0]}
              </p>
              <p className="text-xs text-muted truncate">{qualifications}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-sm">{doctorDetails.rating?.toFixed(1) || '4.5'}</span>
            <span className="text-xs text-muted">({doctorDetails.reviewCount || 0})</span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted">{doctorDetails.experience}+ yrs</span>
          </div>

          {profile.address?.city && (
            <p className="text-xs text-muted flex items-center gap-1 mt-2">
              <MapPin className="h-3 w-3 shrink-0" />
              {profile.address.city}
            </p>
          )}

          {nextSlot ? (
            <p className={cn(
              'mt-3 text-xs font-medium flex items-center gap-1 px-2 py-1.5 rounded-lg',
              nextSlot.label.startsWith('Today') ? 'bg-secondary/10 text-secondary' : 'bg-background text-muted'
            )}>
              <Clock className="h-3.5 w-3.5" />
              {nextSlot.label}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Check availability
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-3">
            {languages && (
              <Badge variant="outline" className="text-[10px]">{languages}</Badge>
            )}
          </div>

          <p className="mt-4 text-lg font-bold text-primary">
            {formatCurrency(fee)}
            <span className="text-xs font-normal text-muted ml-1">/ consult</span>
          </p>
        </div>

        <div className="border-t border-border p-3 bg-background/50 flex gap-2">
          <Link to={`/doctors/${doctor._id}/book`} className="flex-1">
            <Button className="w-full" size="sm">Book Now</Button>
          </Link>
          <Link to={`/doctors/${doctor._id}`} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">View Profile</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
