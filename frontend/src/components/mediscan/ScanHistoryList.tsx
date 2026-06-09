import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Scan } from 'lucide-react';
import { useGetMyScanReportsQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanResultCard } from '@/components/mediscan/ScanResultCard';
import {
  formatScanDate,
  getPredictionTier,
  predictionBadgeVariant,
  scanTypeLabel,
  SCAN_STATUS_LABELS,
} from '@/lib/mediscan';
import { cn } from '@/lib/utils';
import type { ScanReportStatus } from '@/types/mediscan';

const PAGE_SIZE = 5;

function statusBadgeVariant(status: ScanReportStatus): 'default' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'ai_analyzed':
      return 'success';
    case 'ai_unavailable':
      return 'danger';
    case 'doctor_reviewed':
      return 'secondary';
    case 'final':
      return 'default';
    default:
      return 'default';
  }
}

export function ScanHistoryList({ immersive = false }: { immersive?: boolean }) {
  const { data, isLoading, refetch } = useGetMyScanReportsQuery();
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reports = data?.data ?? [];

  const sorted = useMemo(
    () => [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reports]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (isLoading) {
    return (
      <Card className={immersive ? 'mediscan-glass border-0' : ''}>
        <CardContent
          className={cn('py-12 text-center', immersive ? 'text-white/60' : 'text-muted')}
        >
          Loading scan history…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={immersive ? 'mediscan-glass border-0 shadow-none' : ''}>
      <CardHeader>
        <CardTitle
          className={cn('flex items-center gap-2 text-xl', immersive && 'text-white')}
        >
          <Scan className={cn('h-5 w-5', immersive ? 'text-cyan-400' : 'text-primary')} />
          My scan history
        </CardTitle>
        <p className={cn('text-sm', immersive ? 'text-white/50' : 'text-muted')}>
          {sorted.length} scan{sorted.length !== 1 ? 's' : ''} on record
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.length === 0 ? (
          <p
            className={cn(
              'text-center py-8',
              immersive ? 'text-white/50' : 'text-muted'
            )}
          >
            No scans yet. Start your first scan in the studio above.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {pageItems.map((scan) => {
                const expanded = expandedId === scan._id;
                const tier = getPredictionTier(scan.prediction, scan.confidence);
                return (
                  <li
                    key={scan._id}
                    className={cn(
                      'rounded-xl overflow-hidden',
                      immersive
                        ? 'border border-white/10 bg-white/5'
                        : 'border border-border'
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        'w-full flex flex-wrap items-center gap-3 p-4 text-left transition-colors',
                        immersive
                          ? 'hover:bg-white/10 text-white'
                          : 'hover:bg-background/80'
                      )}
                      onClick={() => setExpandedId(expanded ? null : scan._id)}
                    >
                      <div className="flex-1 min-w-[140px]">
                        <p className="font-medium">{scanTypeLabel(scan.scanType)}</p>
                        <p className="text-xs text-muted">{formatScanDate(scan.createdAt)}</p>
                      </div>
                      {scan.prediction && (
                        <Badge variant={predictionBadgeVariant(tier)} className="shrink-0">
                          {scan.prediction}
                        </Badge>
                      )}
                      {scan.confidence != null && (
                        <span className="text-sm font-semibold tabular-nums shrink-0">
                          {scan.confidence.toFixed(0)}%
                        </span>
                      )}
                      <Badge variant={statusBadgeVariant(scan.status)} className="shrink-0">
                        {SCAN_STATUS_LABELS[scan.status]}
                      </Badge>
                      {expanded ? (
                        <ChevronUp className="h-5 w-5 text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted shrink-0" />
                      )}
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 border-t border-border bg-background/50">
                        <ScanResultCard report={scan} onShared={() => refetch()} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
