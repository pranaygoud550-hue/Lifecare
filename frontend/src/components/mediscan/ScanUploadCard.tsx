import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileImage, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useUploadScanMutation } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SCAN_TYPE_OPTIONS, validateScanFile } from '@/lib/mediscan';
import { SkinCameraCapture } from '@/components/mediscan/SkinCameraCapture';
import type { ScanType } from '@/types/mediscan';

interface ScanUploadCardProps {
  onUploadAccepted: (scanId: string) => void;
  /** Open skin camera immediately (e.g. from dashboard link) */
  initialSkinCamera?: boolean;
  /** Immersive MediScan studio styling */
  immersive?: boolean;
}

export function ScanUploadCard({
  onUploadAccepted,
  initialSkinCamera,
  immersive = false,
}: ScanUploadCardProps) {
  const [scanType, setScanType] = useState<ScanType | null>(
    initialSkinCamera ? 'skin_lesion' : null
  );
  const [skinCameraOpen, setSkinCameraOpen] = useState(initialSkinCamera ?? false);
  const [useFileInstead, setUseFileInstead] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploadScan, { isLoading }] = useUploadScanMutation();

  const selectedOption = SCAN_TYPE_OPTIONS.find((o) => o.id === scanType);
  const isSkinMode = scanType === 'skin_lesion';
  const showCamera = isSkinMode && skinCameraOpen && !useFileInstead && !file;

  useEffect(() => {
    if (initialSkinCamera) {
      setScanType('skin_lesion');
      setSkinCameraOpen(true);
    }
  }, [initialSkinCamera]);

  const applyFile = useCallback((f: File) => {
    const err = validateScanFile(f);
    setFileError(err);
    if (!err) {
      setFile(f);
      setSkinCameraOpen(false);
    } else {
      setFile(null);
    }
  }, []);

  const selectScanType = (type: ScanType) => {
    setScanType(type);
    setFile(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';

    if (type === 'skin_lesion') {
      setUseFileInstead(false);
      setSkinCameraOpen(true);
    } else {
      setSkinCameraOpen(false);
      setUseFileInstead(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) applyFile(f);
    },
    [applyFile]
  );

  const submitScan = async (scanFile: File, type: ScanType) => {
    const formData = new FormData();
    formData.append('scan', scanFile);
    formData.append('scanType', type);

    try {
      const res = await uploadScan(formData).unwrap();
      const scanId = res.data?._id;
      if (!scanId) {
        toast.error('Upload succeeded but no scan ID returned');
        return;
      }
      toast.success(
        type === 'skin_lesion'
          ? 'Skin photo captured — analyzing your skin…'
          : 'Scan uploaded — AI analysis started'
      );
      setScanType(null);
      setFile(null);
      setFileError(null);
      setSkinCameraOpen(false);
      setUseFileInstead(false);
      if (inputRef.current) inputRef.current.value = '';
      onUploadAccepted(scanId);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const data = (err as { data?: { message?: string } })?.data;
      if (status === 503) {
        toast.error(data?.message ?? 'Upload service unavailable. Please try again.');
      } else if (status === 422) {
        toast.error(data?.message ?? 'Invalid scan file.');
        setFileError(data?.message ?? 'Invalid file');
      } else {
        toast.error(data?.message ?? 'Upload failed');
      }
    }
  };

  const handleSubmit = async () => {
    if (!scanType || !file) return;
    await submitScan(file, scanType);
  };

  const handleSkinCapture = async (captured: File) => {
    setFile(captured);
    setFileError(null);
    setSkinCameraOpen(false);
    await submitScan(captured, 'skin_lesion');
  };

  const shell = immersive ? 'mediscan-glass rounded-2xl border-0 shadow-none' : '';
  const titleClass = immersive ? 'text-white' : '';
  const mutedClass = immersive ? 'text-white/60' : 'text-muted';

  return (
    <Card className={cn(immersive && 'bg-transparent border-0 shadow-none', shell)}>
      <CardHeader>
        <CardTitle className={cn('text-xl', titleClass)}>
          {isSkinMode ? 'Skin check with front camera' : 'Choose your scan type'}
        </CardTitle>
        <p className={cn('text-sm', mutedClass)}>
          {isSkinMode
            ? 'We detect pimples, pigmentation, dryness, and irritation — then suggest care and OTC products.'
            : 'AI-assisted analysis for chest, skin, and eye imaging'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SCAN_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => selectScanType(opt.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                immersive
                  ? scanType === opt.id
                    ? 'border-cyan-400/60 bg-cyan-500/15 shadow-lg shadow-cyan-500/10 text-white'
                    : 'border-white/15 bg-white/5 hover:border-violet-400/50 hover:bg-white/10 text-white/90'
                  : scanType === opt.id
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-background'
              )}
            >
              <span className="text-3xl" role="img" aria-hidden>
                {opt.emoji}
              </span>
              <span className="font-semibold text-sm">{opt.label}</span>
            </button>
          ))}
        </div>

        {selectedOption && !showCamera && (
          <div
            className={cn(
              'rounded-lg p-4',
              immersive ? 'bg-white/5 border border-white/10' : 'bg-background border border-border'
            )}
          >
            <p className={cn('text-xs font-medium uppercase mb-2', mutedClass)}>Can help detect</p>
            <ul className="flex flex-wrap gap-2">
              {selectedOption.detects.map((d) => (
                <li
                  key={d}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium',
                    immersive
                      ? 'bg-violet-500/25 text-violet-100'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showCamera && (
          <SkinCameraCapture
            onCapture={handleSkinCapture}
            onCancel={() => {
              setSkinCameraOpen(false);
              setScanType(null);
            }}
            onUseUpload={() => {
              setSkinCameraOpen(false);
              setUseFileInstead(true);
              setFile(null);
              setFileError(null);
            }}
          />
        )}

        {isSkinMode && !showCamera && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setUseFileInstead(false);
                setSkinCameraOpen(true);
                setFile(null);
              }}
            >
              Open front camera again
            </Button>
          </div>
        )}

        {scanType && !showCamera && (
          <>
            {isSkinMode && (
              <p className="text-center text-sm text-muted">
                Prefer a saved photo?{' '}
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={() => setUseFileInstead(true)}
                >
                  Upload from gallery
                </button>
              </p>
            )}

            {(!isSkinMode || useFileInstead || file) && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-background',
                  fileError && 'border-red-400/60'
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={isSkinMode ? '.jpg,.jpeg,.png,image/jpeg,image/png' : '.jpg,.jpeg,.png,.dcm,image/jpeg,image/png,application/dicom'}
                  className="hidden"
                  capture={isSkinMode ? 'user' : undefined}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) applyFile(f);
                  }}
                />
                {file ? (
                  <>
                    <FileImage className="h-10 w-10 text-primary" />
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted" />
                    <p className="font-medium text-sm text-center">
                      {isSkinMode
                        ? 'Drop a face/skin photo or tap to browse'
                        : 'Drop your scan here or click to browse'}
                    </p>
                    <p className="text-xs text-muted">
                      {isSkinMode ? 'JPG or PNG — max 10MB' : 'JPG, PNG, or DICOM (.dcm) — max 10MB'}
                    </p>
                  </>
                )}
              </div>
            )}

            {fileError && (
              <p className="flex items-center gap-2 text-sm text-red-600" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {fileError}
              </p>
            )}

            <p className="text-xs text-muted text-center">
              AI results are for reference only. Always consult your doctor or dermatologist.
            </p>

            {file && (
              <Button
                className="w-full"
                size="lg"
                disabled={!!fileError || isLoading}
                onClick={handleSubmit}
              >
                {isLoading ? 'Analyzing…' : isSkinMode ? 'Analyze my skin' : 'Analyze scan'}
              </Button>
            )}
          </>
        )}

        {!scanType && (
          <p className={cn('text-sm text-center', mutedClass)}>
            Select <strong className={immersive ? 'text-cyan-300' : ''}>Skin Check</strong>, then tap{' '}
            <strong className={immersive ? 'text-cyan-300' : ''}>Start front camera</strong> and allow access.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
