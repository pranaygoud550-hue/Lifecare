import { useEffect, useState } from 'react';
import { Loader2, Check, Upload, Cpu } from 'lucide-react';
import { useGetScanReportByIdQuery } from '@/features/api/apiSlice';
import { useMediScanSocket } from '@/hooks/useMediScanSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ScanReport } from '@/types/mediscan';

type Step = 'uploading' | 'processing' | 'complete';

interface ScanProcessingCardProps {
  scanId: string;
  onComplete: (report: ScanReport) => void;
  immersive?: boolean;
}

const STEPS: { id: Step; label: string; icon: typeof Upload }[] = [
  { id: 'uploading', label: 'Uploading', icon: Upload },
  { id: 'processing', label: 'Processing', icon: Cpu },
  { id: 'complete', label: 'Complete', icon: Check },
];

export function ScanProcessingCard({ scanId, onComplete, immersive }: ScanProcessingCardProps) {
  const [activeStep, setActiveStep] = useState<Step>('processing');

  const { data, refetch } = useGetScanReportByIdQuery(scanId, {
    pollingInterval: activeStep !== 'complete' ? 3000 : 0,
  });

  const report = data?.data;

  useMediScanSocket({
    onComplete: (payload) => {
      if (payload.scanId === scanId) {
        setActiveStep('complete');
        void refetch().then((r) => {
          if (r.data?.data) onComplete(r.data.data);
        });
      }
    },
    onAiUnavailable: (payload) => {
      if (payload.scanId === scanId) {
        setActiveStep('complete');
        void refetch().then((r) => {
          if (r.data?.data) onComplete(r.data.data);
        });
      }
    },
  });

  useEffect(() => {
    setActiveStep('uploading');
    const t = window.setTimeout(() => setActiveStep('processing'), 600);
    return () => clearTimeout(t);
  }, [scanId]);

  useEffect(() => {
    if (!report) return;
    if (
      report.status === 'ai_analyzed' ||
      report.status === 'ai_unavailable' ||
      report.status === 'doctor_reviewed' ||
      report.status === 'final'
    ) {
      setActiveStep('complete');
      onComplete(report);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onComplete is stable from parent useCallback
  }, [report?.status, report?._id]);

  const stepIndex = STEPS.findIndex((s) => s.id === activeStep);

  return (
    <Card
      className={cn(
        immersive
          ? 'mediscan-glass border-0 shadow-none text-white'
          : 'border-primary/30 shadow-md'
      )}
    >
      <CardHeader>
        <CardTitle
          className={cn(
            'flex items-center gap-2 text-lg',
            immersive && 'text-white'
          )}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
          {report?.scanType === 'skin_lesion'
            ? 'Analyzing your skin…'
            : 'AI is analyzing your scan…'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex justify-center relative">
          {immersive && (
            <div
              className="absolute inset-0 flex items-center justify-center mediscan-pulse-ring rounded-full w-24 h-24 mx-auto"
              aria-hidden
            />
          )}
          <Loader2
            className={cn(
              'h-12 w-12 animate-spin relative z-10',
              immersive ? 'text-cyan-400' : 'text-primary'
            )}
          />
        </div>
        {report?.scanType === 'skin_lesion' && (
          <p
            className={cn(
              'text-sm text-center -mt-4',
              immersive ? 'text-white/60' : 'text-muted'
            )}
          >
            Checking for pimples, pigmentation, dryness, and irritation…
          </p>
        )}

        <ol className="flex items-center justify-between max-w-md mx-auto w-full">
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            const Icon = step.icon;
            return (
              <li key={step.id} className="flex flex-col items-center flex-1 relative">
                {i > 0 && (
                  <span
                    className={cn(
                      'absolute right-1/2 top-5 w-full h-0.5 -translate-y-1/2',
                      done || current ? 'bg-primary' : 'bg-border'
                    )}
                    style={{ width: '100%', right: '50%' }}
                  />
                )}
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                    done && 'bg-primary border-primary text-primary-foreground',
                    current && 'border-primary bg-primary/10 text-primary',
                    !done && !current && 'border-border text-muted bg-card'
                  )}
                >
                  {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    current ? 'text-primary' : 'text-muted'
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        <p className={cn('text-sm text-center', immersive ? 'text-white/50' : 'text-muted')}>
          You can stay on this page — results will appear automatically when analysis finishes.
        </p>
      </CardContent>
    </Card>
  );
}
