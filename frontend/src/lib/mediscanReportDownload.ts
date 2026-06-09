import type { ScanReport } from '@/types/mediscan';
import { formatScanDate, scanTypeLabel, resolveScanImageUrl } from '@/lib/mediscan';

export function downloadMediscanReport(report: ScanReport): void {
  const probs = report.probabilities
    ? Object.entries(report.probabilities)
        .map(([k, v]) => `<tr><td>${k}</td><td>${(v <= 1 ? v * 100 : v).toFixed(1)}%</td></tr>`)
        .join('')
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>LifeCare+ MediScan Report</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #1a202c; }
    h1 { color: #0066ff; font-size: 1.5rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
    img { max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    td, th { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    .disclaimer { font-size: 12px; color: #718096; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>LifeCare+ MediScan Report</h1>
  <p><strong>Date:</strong> ${formatScanDate(report.createdAt)}</p>
  <p><strong>Scan type:</strong> ${scanTypeLabel(report.scanType)}</p>
  <p><strong>Prediction:</strong> ${report.prediction ?? '—'}</p>
  <p><strong>Confidence:</strong> ${report.confidence?.toFixed(1) ?? '—'}%</p>
  <div class="grid">
    <div>
      <h3>Original scan</h3>
      <img src="${resolveScanImageUrl(report.imageUrl)}" alt="Scan" />
    </div>
    ${
      report.gradcamUrl
        ? `<div><h3>AI attention map</h3><img src="${resolveScanImageUrl(report.gradcamUrl)}" alt="Grad-CAM" /></div>`
        : ''
    }
  </div>
  ${
    probs
      ? `<h3>Probability breakdown</h3><table><thead><tr><th>Class</th><th>Probability</th></tr></thead><tbody>${probs}</tbody></table>`
      : ''
  }
  <p class="disclaimer">AI results are for reference only. Always consult your doctor.</p>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
