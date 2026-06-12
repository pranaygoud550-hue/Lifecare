import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Stethoscope } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useAnalyzeChestScanMutation,
  useShareScanWithDoctorMutation,
} from '@/features/api/apiSlice';
import { ScanUploadZone } from '@/components/patient/ScanUploadZone';
import { ChestScanResultCard } from '@/components/patient/ChestScanResultCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ChestScan } from '@/types/chestScan';

export function ScanAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ChestScan | null>(null);

  const [analyzeScan, { isLoading: analyzing }] = useAnalyzeChestScanMutation();
  const [shareScan, { isLoading: sharing }] = useShareScanWithDoctorMutation();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a chest X-ray image first.');
      return;
    }

    const form = new FormData();
    form.append('image', selectedFile);

    try {
      const response = await analyzeScan(form).unwrap();
      setResult(response.data);
      toast.success('Scan analyzed successfully');
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        'Failed to analyze scan. Please try again.';
      toast.error(message);
    }
  };

  const handleShare = async () => {
    if (!result?._id) return;
    try {
      const response = await shareScan({ id: result._id }).unwrap();
      setResult(response.data as ChestScan);
      toast.success('Scan shared with your doctor');
    } catch {
      toast.error('Could not share scan. Please try again.');
    }
  };

  const resetFlow = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <Helmet>
        <title>Chest X-Ray Analysis | LifeCare+</title>
      </Helmet>

      <div className="container-custom py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Stethoscope className="h-8 w-8 text-primary" />
            Chest X-Ray Analysis
          </h1>
          <p className="max-w-2xl text-muted">
            Upload a chest X-ray for AI screening. Results include prediction, confidence,
            and a plain-English explanation powered by MediScan AI.
          </p>
        </div>

        {!result && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <ScanUploadZone onFileSelect={handleFileSelect} disabled={analyzing} />
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-center">
              <CardContent className="space-y-4 p-6">
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div>
                      <p className="text-lg font-semibold">Analyzing your scan...</p>
                      <p className="text-sm text-muted">
                        Our AI is reviewing your chest X-ray. This may take a few seconds.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">Ready to analyze?</h2>
                    <p className="text-sm text-muted">
                      {selectedFile
                        ? `Selected: ${selectedFile.name}`
                        : 'Select or drag a chest X-ray image to begin.'}
                    </p>
                    <Button
                      size="lg"
                      className="w-full"
                      disabled={!selectedFile}
                      onClick={handleAnalyze}
                    >
                      Upload & Analyze
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <ChestScanResultCard
              scan={result}
              thumbnailUrl={previewUrl ?? undefined}
              onShare={handleShare}
              sharing={sharing}
              shared={result.sharedWithDoctor}
            />
            <Button variant="outline" onClick={resetFlow}>
              Analyze another scan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
