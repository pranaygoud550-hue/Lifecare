import { Building2, MapPin, Star, Ambulance, BedDouble } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Hospital } from '@/types';

interface HospitalCardProps {
  hospital: Hospital;
  compact?: boolean;
}

export function HospitalCard({ hospital, compact }: HospitalCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug mb-1">{hospital.name}</h3>
            <p className="text-xs text-muted flex items-start gap-1 mb-2">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{hospital.address}, {hospital.city}</span>
            </p>

            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge variant="outline" className="text-xs capitalize">{hospital.type.replace('-', ' ')}</Badge>
              {hospital.emergencyAvailable && (
                <Badge variant="danger" className="text-xs gap-0.5">
                  <Ambulance className="h-3 w-3" /> 24/7 ER
                </Badge>
              )}
              {hospital.beds && (
                <Badge variant="secondary" className="text-xs gap-0.5">
                  <BedDouble className="h-3 w-3" /> {hospital.beds} beds
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="text-sm font-medium text-foreground">{hospital.rating.toFixed(1)}</span>
                <span className="text-xs text-muted">({hospital.reviewCount})</span>
              </div>
            </div>

            {!compact && hospital.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {hospital.specialties.slice(0, 3).map((s) => (
                  <span key={s} className="text-xs bg-background px-2 py-0.5 rounded-full text-muted">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
