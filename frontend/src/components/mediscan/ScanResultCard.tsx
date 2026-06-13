import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Share2, CalendarPlus, Download, AlertTriangle, Salad } from 'lucide-react';
import { toast } from 'react-toastify';
import { useShareScanWithDoctorMutation } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceRing } from '@/components/mediscan/ConfidenceRing';
import { ShareDoctorModal } from '@/components/mediscan/ShareDoctorModal';
import {
  getPredictionTier,
  predictionBadgeVariant,
  predictionLabel,
  resolveScanImageUrl,
  scanTypeLabel,
} from '@/lib/mediscan';
import { downloadMediscanReport } from '@/lib/mediscanReportDownload';
import { buildScanBookingPrefill, doctorsPageSearchFromScan } from '@/lib/mediscanBooking';
import { SkinCareResultPanel } from '@/components/mediscan/SkinCareResultPanel';
import type { ScanReport } from '@/types/mediscan';
import type { ScanBookingPrefill } from '@/lib/mediscanBooking';

interface ScanResultCardProps {
  report: ScanReport;
  onShared?: () => void;
}

export function ScanResultCard({ report, onShared }: ScanResultCardProps) {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareScan, { isLoading: sharing }] = useShareScanWithDoctorMutation();

  const tier = getPredictionTier(report.prediction, report.confidence);
  const probs = report.probabilities ? Object.entries(report.probabilities) : [];
  const maxProb = Math.max(...probs.map(([, v]) => (v <= 1 ? v * 100 : v)), 1);

  const handleShare = async (doctorId: string) => {
    try {
      await shareScan({ id: report._id, doctorId }).unwrap();
      toast.success('Scan shared with your doctor');
      setShareOpen(false);
      onShared?.();
    } catch {
      toast.error('Could not share scan');
    }
  };

  const handleBook = () => {
    const prefill: ScanBookingPrefill = buildScanBookingPrefill(report);
    const doctorId =
      typeof report.doctorId === 'string' ? report.doctorId : undefined;

    if (doctorId) {
      navigate(`/doctors/${doctorId}/book`, { state: { scanBooking: prefill } });
      return;
    }

    const params = new URLSearchParams(doctorsPageSearchFromScan(report));
    navigate(`/doctors?${params.toString()}`, { state: { scanBooking: prefill } });
  };

  if (report.status === 'ai_unavailable') {
    return (
      <Card className="border-amber-300/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Manual review required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            AI analysis is temporarily unavailable. Your scan has been saved and a doctor can review it manually.
          </p>
          {report.scanType === 'skin_lesion' && (
            <SkinCareResultPanel report={report} onBookDermatologist={handleBook} />
          )}
          <img
            src={resolveScanImageUrl(report.imageUrl)}
            alt="Uploaded scan"
            className="rounded-lg border border-border max-h-64 object-contain mx-auto"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" /> Share with doctor
            </Button>
            <Button className="gap-2" onClick={handleBook}>
              <CalendarPlus className="h-4 w-4" /> Book appointment
            </Button>
          </div>
        </CardContent>
        <ShareDoctorModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          onSelect={handleShare}
          isLoading={sharing}
        />
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex flex-wrap items-center gap-2">
            Analysis results
            {report.status === 'ai_analyzed' && (
              <Badge variant="secondary" className="text-xs font-normal">
                LifeCare AI screening
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted">{scanTypeLabel(report.scanType)}</p>
        </div>
        <Badge variant={predictionBadgeVariant(tier)} className="text-sm px-3 py-1">
          {report.prediction ?? predictionLabel(tier)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border overflow-hidden bg-background">
            <p className="text-xs font-medium text-muted px-3 py-2 border-b border-border">Original scan</p>
            <img
              src={resolveScanImageUrl(report.imageUrl)}
              alt="Original scan"
              className="w-full h-56 object-contain bg-black/5"
            />
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-background">
            <p className="text-xs font-medium text-muted px-3 py-2 border-b border-border">
              AI attention map
            </p>
            {report.gradcamUrl ? (
              <img
                src={resolveScanImageUrl(report.gradcamUrl)}
                alt="Grad-CAM heatmap"
                className="w-full h-56 object-contain bg-black/5"
              />
            ) : (
              <div className="h-56 flex items-center justify-center text-sm text-muted p-4 text-center">
                Heatmap not available for this scan
              </div>
            )}
          </div>
        </div>

        {report.scanType === 'skin_lesion' && (
          <SkinCareResultPanel report={report} onBookDermatologist={handleBook} />
        )}

        <div className="flex flex-col sm:flex-row items-center gap-8 justify-center py-2">
          <ConfidenceRing value={report.confidence ?? 0} />
          <div className="flex-1 w-full max-w-md space-y-3">
            <p className="text-sm font-medium">Probability breakdown</p>
            {probs.length === 0 ? (
              <p className="text-sm text-muted">No class probabilities returned</p>
            ) : (
              probs.map(([label, value]) => {
                const pct = value <= 1 ? value * 100 : value;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium capitalize">{label}</span>
                      <span className="text-muted tabular-nums">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(pct / maxProb) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <Link to="/dashboard?tab=vitals">
            <Button variant="default" className="gap-2">
              <Salad className="h-4 w-4" /> View diet + vitals plan
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" /> Share with doctor
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleBook}>
            <CalendarPlus className="h-4 w-4" /> Book appointment
          </Button>
          <Button variant="secondary" className="gap-2" onClick={() => downloadMediscanReport(report)}>
            <Download className="h-4 w-4" /> Download report
          </Button>
        </div>

        <p className="text-xs text-muted text-center">
          AI results are for reference only. Always consult your doctor.
        </p>
      </CardContent>

      <ShareDoctorModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onSelect={handleShare}
        isLoading={sharing}
      />
    </Card>
  );
}
