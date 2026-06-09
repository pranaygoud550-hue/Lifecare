const MAX_SAMPLES = 200;
const samples: number[] = [];

export function recordResponseTime(ms: number): void {
  samples.push(ms);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function getAverageResponseTimeMs(): number {
  if (samples.length === 0) return 0;
  const sum = samples.reduce((a, b) => a + b, 0);
  return Math.round(sum / samples.length);
}

export function requestTimingMiddleware(
  _req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): void {
  const start = Date.now();
  res.on('finish', () => {
    recordResponseTime(Date.now() - start);
  });
  next();
}
