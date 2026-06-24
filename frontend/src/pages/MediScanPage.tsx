import { useCallback, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { History, RotateCcw } from 'lucide-react';
import { useGetScanReportByIdQuery } from '@/features/api/apiSlice';
import { MediScanHero } from '@/components/mediscan/MediScanHero';
import { ScanUploadCard } from '@/components/mediscan/ScanUploadCard';
import { ScanProcessingCard } from '@/components/mediscan/ScanProcessingCard';
import { ScanResultCard } from '@/components/mediscan/ScanResultCard';
import { ScanHistoryList } from '@/components/mediscan/ScanHistoryList';
import { MediScanSafetyNotice } from '@/components/mediscan/MediScanSafetyNotice';
import { cn } from '@/lib/utils';
import type { ScanReport } from '@/types/mediscan';

type FlowStep = 'discover' | 'analyze' | 'results';

export function MediScanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scanFromQuery = searchParams.get('scan');
  const skinMode = searchParams.get('mode') === 'skin';
  const scannerRef = useRef<HTMLDivElement>(null);

  const [processingScanId, setProcessingScanId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<ScanReport | null>(null);
  const [startSkinCamera, setStartSkinCamera] = useState(skinMode);

  const { data: deepLinkData } = useGetScanReportByIdQuery(scanFromQuery ?? '', {
    skip: !scanFromQuery,
  });

  const deepLinkResult = deepLinkData?.data ?? null;
  const displayResult = activeResult ?? deepLinkResult;

  const handleUploadAccepted = useCallback((scanId: string) => {
    setProcessingScanId(scanId);
    setActiveResult(null);
    setStartSkinCamera(false);
  }, []);

  const handleAnalysisComplete = useCallback((report: ScanReport) => {
    setActiveResult(report);
    setProcessingScanId(null);
  }, []);

  const showProcessing = processingScanId && !displayResult;
  const showResult = displayResult && !processingScanId;

  const activeStep: FlowStep = showResult ? 'results' : showProcessing ? 'analyze' : 'discover';

  const resetFlow = () => {
    setActiveResult(null);
    setProcessingScanId(null);
    setStartSkinCamera(false);
    if (scanFromQuery) {
      searchParams.delete('scan');
      setSearchParams(searchParams, { replace: true });
    }
    scannerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToScanner = () => {
    scannerRef.current?.scrollIntoView({ behavior: 'smooth' });
    setStartSkinCamera(true);
  };

  return (
    <div className="mediscan-page min-h-screen">
      <Helmet>
        <title>MediScan AI Studio | LifeCare+</title>
        <meta
          name="description"
          content="LifeCare+ MediScan AI Studio — immersive skin camera, chest X-ray, and eye analysis."
        />
      </Helmet>

      <div className="container-custom py-6 sm:py-10 space-y-8">
        <MediScanHero
          compact={Boolean(showProcessing || showResult)}
          activeStep={activeStep}
          onStartSkin={scrollToScanner}
        />

        <MediScanSafetyNotice dark className="max-w-3xl mx-auto" />

        <div id="mediscan-scanner" ref={scannerRef} className="scroll-mt-24">
          <section aria-label="AI scanner" className="max-w-3xl mx-auto">
            {!showProcessing && !showResult && (
              <ScanUploadCard
                immersive
                onUploadAccepted={handleUploadAccepted}
                initialSkinCamera={startSkinCamera || skinMode}
              />
            )}

            {showProcessing && processingScanId && (
              <ScanProcessingCard
                immersive
                scanId={processingScanId}
                onComplete={handleAnalysisComplete}
              />
            )}

            {showResult && displayResult && (
              <div className="space-y-4">
                <div className="mediscan-glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-cyan-200/90 font-medium">Analysis complete</p>
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    New scan
                  </button>
                </div>
                <div className="rounded-2xl overflow-hidden ring-1 ring-white/10">
                  <ScanResultCard report={displayResult} />
                </div>
              </div>
            )}
          </section>
        </div>

        <section aria-label="Scan history" className={cn(!showResult && 'opacity-90')}>
          <div className="flex items-center gap-2 mb-4 text-white/70">
            <History className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Your scan archive</h2>
          </div>
          <ScanHistoryList immersive />
        </section>
      </div>
    </div>
  );
}
