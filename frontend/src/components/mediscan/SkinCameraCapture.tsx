import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, FlipHorizontal, Upload, X, Sparkles, RefreshCw, Sun, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  attachStreamToVideo,
  openCameraStream,
  queryCameraPermission,
  type CameraError,
} from '@/lib/cameraUtils';

interface SkinCameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  onUseUpload?: () => void;
}

type LightingQuality = 'good' | 'low' | 'too_bright' | 'unknown';

function analyzeLighting(video: HTMLVideoElement): LightingQuality {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return 'unknown';

  const canvas = document.createElement('canvas');
  canvas.width = Math.min(w, 320);
  canvas.height = Math.min(h, 420);
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unknown';

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const avg = sum / (data.length / 4);
  if (avg < 55) return 'low';
  if (avg > 210) return 'too_bright';
  return 'good';
}

export function SkinCameraCapture({ onCapture, onCancel, onUseUpload }: SkinCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [facingUser, setFacingUser] = useState(true);
  const [awaitingStart, setAwaitingStart] = useState(true);
  const [lighting, setLighting] = useState<LightingQuality>('unknown');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [resolutionOk, setResolutionOk] = useState(true);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
    setLighting('unknown');
  }, []);

  const startCamera = useCallback(
    async (useFrontCamera: boolean) => {
      setError(null);
      setReady(false);
      setStarting(true);
      stopStream();

      try {
        const stream = await openCameraStream(useFrontCamera);
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          throw { code: 'unknown', message: 'Camera preview failed to load. Please try again.' } satisfies CameraError;
        }

        await attachStreamToVideo(stream, video);
        setResolutionOk(video.videoWidth >= 640);
        setReady(true);
        setAwaitingStart(false);
      } catch (err) {
        const cameraErr = err as CameraError;
        setError(
          cameraErr?.message
            ? cameraErr
            : { code: 'unknown', message: 'Could not start the camera. Try again or upload a photo.' }
        );
      } finally {
        setStarting(false);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    let cancelled = false;

    async function checkPermission() {
      const permission = await queryCameraPermission();
      if (cancelled) return;
      if (permission === 'granted') {
        setAwaitingStart(false);
        startCamera(true);
      }
    }

    checkPermission();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [startCamera, stopStream]);

  useEffect(() => {
    if (!ready || countdown != null) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (video?.videoWidth) {
        setLighting(analyzeLighting(video));
        setResolutionOk(video.videoWidth >= 640);
      }
    }, 600);
    return () => window.clearInterval(id);
  }, [ready, countdown]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingUser) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `skin-scan-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        stopStream();
        onCapture(file);
      },
      'image/jpeg',
      0.96
    );
  }, [facingUser, onCapture, ready, stopStream]);

  const handleCapture = () => {
    if (lighting === 'low') {
      const ok = window.confirm(
        'Lighting looks low — results may be less accurate. Capture anyway, or move closer to a window and try again.'
      );
      if (!ok) return;
    }
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown == null) return;
    if (countdown === 0) {
      setCountdown(null);
      captureFrame();
      return;
    }
    const t = window.setTimeout(() => setCountdown(countdown - 1), 700);
    return () => window.clearTimeout(t);
  }, [countdown, captureFrame]);

  const handleStartClick = () => {
    setAwaitingStart(false);
    startCamera(facingUser);
  };

  const handleFlip = async () => {
    const next = !facingUser;
    setFacingUser(next);
    if (!awaitingStart) {
      await startCamera(next);
    }
  };

  const showPreview = !error && !awaitingStart;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Face camera — clear skin scan
          </h3>
          <p className="text-sm text-muted mt-1">
            Center your face in the oval, use even daylight, and hold still — we analyze pores, spots,
            redness, and texture in detail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            stopStream();
            onCancel();
          }}
          className="p-2 rounded-lg hover:bg-background text-muted"
          aria-label="Close camera"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-xl border border-violet-200/60 bg-violet-50/40 p-4 text-sm space-y-2">
        <p className="font-semibold text-violet-900">For the clearest scan</p>
        <ul className="text-xs text-violet-900/90 space-y-1 list-disc list-inside">
          <li>Remove glasses, pull hair back, wash face (no heavy cream before scan)</li>
          <li>Stand 30–40 cm away; face a window or lamp — avoid backlight</li>
          <li>Fill the oval: forehead, both cheeks, nose, and chin visible</li>
          <li>Hold still when countdown reaches 1 — we capture a sharp photo</li>
        </ul>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-[420px] mx-auto">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            showPreview ? 'opacity-100' : 'opacity-0',
            facingUser && 'scale-x-[-1]'
          )}
        />

        {showPreview && (
          <>
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <div className="w-[72%] h-[58%] rounded-[50%] border-2 border-dashed border-white/80 shadow-[inset_0_0_40px_rgba(0,0,0,0.2)]" />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="w-[72%] h-[58%] relative text-[10px] text-white/70 font-medium">
                <span className="absolute top-[8%] left-1/2 -translate-x-1/2">Forehead</span>
                <span className="absolute top-[38%] left-[8%]">Cheek</span>
                <span className="absolute top-[38%] right-[8%]">Cheek</span>
                <span className="absolute bottom-[28%] left-1/2 -translate-x-1/2">Nose · Chin</span>
              </div>
            </div>
            <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none">
              {lighting === 'good' && (
                <Badge className="bg-emerald-600/90 text-white border-0 gap-1">
                  <Sun className="h-3 w-3" /> Good lighting
                </Badge>
              )}
              {lighting === 'low' && (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Too dark — move to light
                </Badge>
              )}
              {lighting === 'too_bright' && (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Too bright — soften light
                </Badge>
              )}
              {!resolutionOk && (
                <Badge variant="warning">Move closer for sharper detail</Badge>
              )}
            </div>
          </>
        )}

        {countdown != null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <span className="text-7xl font-black text-white tabular-nums">{countdown || '…'}</span>
          </div>
        )}

        {awaitingStart && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-black/90">
            <Camera className="h-12 w-12 text-white/80" />
            <div className="space-y-2">
              <p className="text-white font-medium">Ready for a clear skin scan?</p>
              <p className="text-sm text-white/70">
                Tap below — your browser will ask to use the camera. Choose <strong>Allow</strong>.
              </p>
            </div>
            <Button type="button" size="lg" className="gap-2" onClick={handleStartClick} disabled={starting}>
              <Camera className="h-4 w-4" />
              {starting ? 'Starting camera…' : 'Start front camera'}
            </Button>
            {onUseUpload && (
              <Button type="button" variant="ghost" size="sm" className="text-white/80" onClick={onUseUpload}>
                <Upload className="h-4 w-4 mr-1" />
                Upload photo instead
              </Button>
            )}
          </div>
        )}

        {starting && !awaitingStart && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-sm text-white">Starting camera…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-black/90">
            <p className="text-sm text-white">{error.message}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button type="button" size="sm" className="gap-1" onClick={handleStartClick} disabled={starting}>
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              {onUseUpload && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                  onClick={onUseUpload}
                >
                  <Upload className="h-4 w-4" />
                  Upload photo
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleFlip}
          disabled={!!error || awaitingStart || starting || countdown != null}
        >
          <FlipHorizontal className="h-4 w-4" />
          {facingUser ? 'Front' : 'Back'} camera
        </Button>
        <Button
          type="button"
          size="lg"
          className="gap-2 flex-1 min-w-[200px]"
          disabled={!ready || !!error || awaitingStart || countdown != null}
          onClick={handleCapture}
        >
          <Sparkles className="h-4 w-4" />
          {countdown != null ? 'Hold still…' : 'Capture & analyze skin'}
        </Button>
      </div>
    </div>
  );
}
