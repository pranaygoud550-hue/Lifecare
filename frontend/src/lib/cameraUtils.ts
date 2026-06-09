export type CameraErrorCode =
  | 'not-supported'
  | 'insecure-context'
  | 'permission-denied'
  | 'not-found'
  | 'in-use'
  | 'unknown';

export interface CameraError {
  code: CameraErrorCode;
  message: string;
}

const CONSTRAINT_ATTEMPTS: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
  { video: { facingMode: 'user' }, audio: false },
  { video: true, audio: false },
];

function mapMediaError(err: unknown): CameraError {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        code: 'permission-denied',
        message:
          'Camera access was blocked. Click “Allow” when your browser asks, or enable camera for this site in browser settings.',
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        code: 'not-found',
        message: 'No camera was found on this device. Upload a photo from your gallery instead.',
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        code: 'in-use',
        message: 'Your camera may be in use by another app (FaceTime, Zoom, etc.). Close it and try again.',
      };
    case 'OverconstrainedError':
      return {
        code: 'not-found',
        message: 'Could not use the front camera on this device. Try the back camera or upload a photo.',
      };
    default:
      return {
        code: 'unknown',
        message: 'Could not start the camera. Try again or upload a photo instead.',
      };
  }
}

export function isSecureCameraContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

export async function queryCameraPermission(): Promise<PermissionState | 'unknown'> {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return result.state;
  } catch {
    return 'unknown';
  }
}

export async function openCameraStream(facingUser: boolean): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw { code: 'not-supported', message: 'Camera is not supported on this device. Upload a photo instead.' } satisfies CameraError;
  }

  if (!isSecureCameraContext()) {
    throw {
      code: 'insecure-context',
      message:
        'Camera requires a secure connection. Open the app at http://localhost:5173 (not an IP address), or use “Upload from gallery”.',
    } satisfies CameraError;
  }

  const attempts = facingUser
    ? CONSTRAINT_ATTEMPTS
    : [{ video: { facingMode: { ideal: 'environment' } }, audio: false }, { video: true, audio: false }];

  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
    }
  }

  throw mapMediaError(lastErr);
}

export async function attachStreamToVideo(stream: MediaStream, video: HTMLVideoElement): Promise<void> {
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  await video.play();
}
