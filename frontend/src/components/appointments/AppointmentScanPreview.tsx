import { Link } from 'react-router-dom';
import { Brain, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  getPredictionTier,
  predictionBadgeVariant,
  resolveScanImageUrl,
  scanTypeLabel,
} from '@/lib/mediscan';
import type { ScanReport } from '@/types/mediscan';
import { cn } from '@/lib/utils';

export interface AppointmentScanPreviewProps {
  scan: ScanReport;
  /** Doctor view: compact preview at top of appointment */
  variant?: 'doctor' | 'patient';
  className?: string;
}

export function AppointmentScanPreview({
  scan,
  variant = 'doctor',
  className,
}: AppointmentScanPreviewProps) {
  const tier = getPredictionTier(scan.prediction, scan.confidence);

  return (
    <Card className={cn('border-primary/25 bg-primary/5', className)}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="shrink-0">
            <img
              src={resolveScanImageUrl(scan.imageUrl)}
              alt="Attached scan"
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-lg object-cover border border-border"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">
                {variant === 'doctor' ? 'Attached MediScan' : 'Scan linked to appointment'}
              </span>
              <Badge variant="secondary">{scanTypeLabel(scan.scanType)}</Badge>
            </div>
            {variant === 'doctor' && (
              <p className="text-xs text-muted">
                Review AI findings before your consultation.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={predictionBadgeVariant(tier)}>
                {scan.prediction ?? 'Awaiting analysis'}
              </Badge>
              {scan.confidence != null && (
                <span className="text-sm font-medium tabular-nums">
                  {scan.confidence.toFixed(0)}% confidence
                </span>
              )}
            </div>
            {scan.doctorNote && variant === 'patient' && (
              <p className="text-sm text-muted border-l-2 border-primary pl-2">
                Doctor note: {scan.doctorNote}
              </p>
            )}
            <Link to={`/dashboard/mediscan?scan=${scan._id}`}>
              <Button size="sm" variant="outline" className="gap-1 mt-1">
                <ExternalLink className="h-3.5 w-3.5" />
                View scan
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Normalize populated scanReportId from appointment API */
export function scanFromAppointment(
  scanReportId: ScanReport | string | undefined | null
): ScanReport | null {
  if (!scanReportId || typeof scanReportId === 'string') return null;
  return scanReportId as ScanReport;
}
