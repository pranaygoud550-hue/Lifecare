import { useMemo, useState } from 'react';
import { ArrowUpDown, ClipboardList } from 'lucide-react';
import { useGetDoctorScansQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  formatScanDate,
  scanTypeLabel,
  SCAN_STATUS_LABELS,
} from '@/lib/mediscan';
import {
  filterScans,
  isUrgentReview,
  patientDisplayName,
  sortScans,
  type ScanSortDir,
  type ScanSortKey,
} from '@/lib/mediscanDoctor';
import type { ScanReport, ScanReportStatus, ScanType } from '@/types/mediscan';
import { cn } from '@/lib/utils';

export interface PendingScansTableProps {
  onReview: (scan: ScanReport) => void;
}

export function PendingScansTable({ onReview }: PendingScansTableProps) {
  const { data, isLoading } = useGetDoctorScansQuery();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ScanSortKey>('date');
  const [sortDir, setSortDir] = useState<ScanSortDir>('desc');

  const scans = useMemo(() => {
    const list = (data?.data ?? []) as ScanReport[];
    return sortScans(filterScans(list, statusFilter, typeFilter), sortBy, sortDir);
  }, [data?.data, statusFilter, typeFilter, sortBy, sortDir]);

  const toggleSort = (key: ScanSortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5 text-primary" />
          AI scan queue
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {(Object.keys(SCAN_STATUS_LABELS) as ScanReportStatus[]).map((s) => (
              <option key={s} value={s}>
                {SCAN_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card"
            aria-label="Filter by scan type"
          >
            <option value="all">All types</option>
            <option value="chest_xray">Chest X-Ray</option>
            <option value="skin_lesion">Skin Lesion</option>
            <option value="retina">Eye Scan</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isLoading ? (
          <p className="p-8 text-center text-muted">Loading scans…</p>
        ) : scans.length === 0 ? (
          <p className="p-8 text-center text-muted">No scans match your filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/80 text-left">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-primary" onClick={() => toggleSort('scanType')}>
                    Scan type <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">AI prediction</th>
                <th className="px-4 py-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-primary" onClick={() => toggleSort('confidence')}>
                    Confidence <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-primary" onClick={() => toggleSort('date')}>
                    Uploaded <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr
                  key={scan._id}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors',
                    isUrgentReview(scan) && 'bg-amber-50/80 hover:bg-amber-50'
                  )}
                >
                  <td className="px-4 py-3 font-medium">{patientDisplayName(scan)}</td>
                  <td className="px-4 py-3">{scanTypeLabel(scan.scanType as ScanType)}</td>
                  <td className="px-4 py-3 max-w-[140px] truncate">{scan.prediction ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {scan.confidence != null ? (
                      <span className={cn(isUrgentReview(scan) && 'text-amber-800 font-semibold')}>
                        {scan.confidence.toFixed(0)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{formatScanDate(scan.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={scan.status === 'final' ? 'success' : scan.status === 'pending' ? 'warning' : 'secondary'}>
                      {SCAN_STATUS_LABELS[scan.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => onReview(scan)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
