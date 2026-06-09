import { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle2, RotateCcw, FlaskConical, Flag } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetScanReportByIdQuery,
  useReviewDoctorScanMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ConfidenceRing } from '@/components/mediscan/ConfidenceRing';
import {
  resolveScanImageUrl,
  scanTypeLabel,
  getPredictionTier,
  predictionBadgeVariant,
} from '@/lib/mediscan';
import {
  diagnosisOptionsForScan,
  medicalHistorySummary,
  patientAge,
  patientDisplayName,
} from '@/lib/mediscanDoctor';
import type { ScanReport } from '@/types/mediscan';
import { cn } from '@/lib/utils';

export interface ScanReviewModalProps {
  scan: ScanReport | null;
  pendingQueue: ScanReport[];
  onClose: () => void;
  onReviewSubmitted: (nextScan: ScanReport | null) => void;
}

export function ScanReviewModal({
  scan,
  pendingQueue,
  onClose,
  onReviewSubmitted,
}: ScanReviewModalProps) {
  const [doctorNote, setDoctorNote] = useState('');
  const [overrideValue, setOverrideValue] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const scanId = scan?._id ?? '';
  const { data: detailData } = useGetScanReportByIdQuery(scanId, { skip: !scanId });
  const report = detailData?.data ?? scan;

  const [reviewScan, { isLoading: submitting }] = useReviewDoctorScanMutation();

  useEffect(() => {
    setDoctorNote(report?.doctorNote ?? '');
    setOverrideValue(report?.doctorOverride ?? '');
    setShowOverride(!!report?.doctorOverride);
  }, [report?._id, report?.doctorNote, report?.doctorOverride]);

  const overrideOptions = useMemo(
    () => (report ? diagnosisOptionsForScan(report) : []),
    [report]
  );

  const probs = report?.probabilities ? Object.entries(report.probabilities) : [];
  const maxProb = Math.max(...probs.map(([, v]) => (v <= 1 ? v * 100 : v)), 1);
  const tier = getPredictionTier(report?.prediction, report?.confidence);

  if (!scan || !report) return null;

  const reviewDurationSeconds = Math.round((Date.now() - startedAt) / 1000);

  const submitReview = async (payload: {
    aiConfirmed?: boolean;
    doctorOverride?: string;
    requestMoreTests?: boolean;
    markFinal?: boolean;
  }) => {
    try {
      await reviewScan({
        id: report._id,
        doctorNote: doctorNote.trim() || undefined,
        reviewDurationSeconds,
        ...payload,
      }).unwrap();

      toast.success(payload.markFinal ? 'Scan marked as final — patient notified' : 'Review saved');

      const pending = pendingQueue.filter(
        (s) =>
          s._id !== report._id &&
          ['ai_analyzed', 'ai_unavailable'].includes(s.status)
      );
      const next = pending[0] ?? null;
      onReviewSubmitted(next);
    } catch {
      toast.error('Failed to save review');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0 bg-card">
        <div>
          <h2 className="text-lg font-bold">Review AI scan</h2>
          <p className="text-sm text-muted">
            {scanTypeLabel(report.scanType)} · {patientDisplayName(report)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-background"
          aria-label="Close review"
        >
          <X className="h-6 w-6" />
        </button>
      </header>

      <div className="flex-1 overflow-hidden grid lg:grid-cols-2">
        {/* Left: images */}
        <div className="overflow-y-auto p-4 space-y-4 border-b lg:border-b-0 lg:border-r border-border bg-muted/20">
          <div className="grid sm:grid-cols-2 gap-4">
            <figure className="rounded-xl border border-border overflow-hidden bg-card">
              <figcaption className="text-xs font-medium text-muted px-3 py-2 border-b border-border">
                Original scan
              </figcaption>
              <img
                src={resolveScanImageUrl(report.imageUrl)}
                alt="Original"
                className="w-full h-64 object-contain bg-black/5"
              />
            </figure>
            <figure className="rounded-xl border border-border overflow-hidden bg-card">
              <figcaption className="text-xs font-medium text-muted px-3 py-2 border-b border-border">
                AI attention map (Grad-CAM)
              </figcaption>
              {report.gradcamUrl ? (
                <img
                  src={resolveScanImageUrl(report.gradcamUrl)}
                  alt="Grad-CAM"
                  className="w-full h-64 object-contain bg-black/5"
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-muted p-4 text-center">
                  Grad-CAM not available
                </div>
              )}
            </figure>
          </div>
        </div>

        {/* Right: review panel */}
        <div className="overflow-y-auto p-4 space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <ConfidenceRing value={report.confidence ?? 0} size={100} />
            <div>
              <Badge variant={predictionBadgeVariant(tier)} className="mb-2">
                {report.prediction ?? 'No prediction'}
              </Badge>
              <p className="text-sm text-muted">AI confidence score</p>
            </div>
          </div>

          {probs.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Probability breakdown</p>
              <div className="space-y-2">
                {probs.map(([label, value]) => {
                  const pct = value <= 1 ? value * 100 : value;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize">{label}</span>
                        <span className="tabular-nums">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(pct / maxProb) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border p-4 bg-card space-y-2 text-sm">
            <p className="font-semibold">Patient</p>
            <p>
              <span className="text-muted">Name:</span> {patientDisplayName(report)}
            </p>
            <p>
              <span className="text-muted">Age:</span> {patientAge(report)}
            </p>
            <p>
              <span className="text-muted">History:</span> {medicalHistorySummary(report)}
            </p>
          </div>

          <div>
            <Label htmlFor="doctor-note">Doctor&apos;s note</Label>
            <textarea
              id="doctor-note"
              value={doctorNote}
              onChange={(e) => setDoctorNote(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm resize-y min-h-[100px]"
              placeholder="Clinical observations, follow-up plan…"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={submitting}
              onClick={() =>
                submitReview({ aiConfirmed: true, doctorOverride: undefined })
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              AI is correct
            </Button>
            <Button
              variant="outline"
              className={cn('gap-2', showOverride && 'border-primary')}
              disabled={submitting}
              onClick={() => setShowOverride((v) => !v)}
            >
              <RotateCcw className="h-4 w-4" />
              Override AI
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={submitting}
              onClick={() => submitReview({ requestMoreTests: true })}
            >
              <FlaskConical className="h-4 w-4" />
              Request more tests
            </Button>
          </div>

          {showOverride && (
            <div>
              <Label htmlFor="override-diagnosis">Correct diagnosis</Label>
              <select
                id="override-diagnosis"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">Select diagnosis…</option>
                {overrideOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <Button
                className="mt-2"
                size="sm"
                disabled={!overrideValue || submitting}
                onClick={() =>
                  submitReview({ aiConfirmed: false, doctorOverride: overrideValue })
                }
              >
                Save override
              </Button>
            </div>
          )}

          <Button
            className="w-full gap-2"
            size="lg"
            disabled={submitting}
            onClick={() => submitReview({ markFinal: true })}
          >
            <Flag className="h-4 w-4" />
            Mark as final & notify patient
          </Button>
        </div>
      </div>
    </div>
  );
}
