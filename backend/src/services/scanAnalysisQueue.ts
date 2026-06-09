import { runScanAnalysisJob } from './scanService.js';

const queue: string[] = [];
let draining = false;

/**
 * In-process FIFO queue for MediScan AI analysis jobs.
 */
export function enqueueScanAnalysis(reportId: string): void {
  queue.push(reportId);
  void drainQueue();
}

async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;

  while (queue.length > 0) {
    const reportId = queue.shift()!;
    try {
      await runScanAnalysisJob(reportId);
    } catch (err) {
      console.error(`[MediScan] Analysis job failed for ${reportId}:`, err);
    }
  }

  draining = false;
}

export function getScanQueueLength(): number {
  return queue.length;
}
