import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, History, Scan } from 'lucide-react';
import { useGetUnifiedScanHistoryQuery } from '@/features/api/apiSlice';
import { ScanResultCard } from '@/components/mediscan/ScanResultCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  formatScanDate,
  getPredictionTier,
  predictionBadgeVariant,
  scanTypeLabel,
  SCAN_STATUS_LABELS,
  resolveScanImageUrl,
} from '@/lib/mediscan';
import {
  chestScanBadgeVariant,
  formatChestScanDate,
  resolveChestScanImageUrl,
} from '@/lib/chestScan';
import { cn } from '@/lib/utils';
import type { ScanReport, ScanReportStatus } from '@/types/mediscan';
import type { UnifiedScanHistoryItem, UnifiedScanType } from '@/types/scanHistory';

const PAGE_SIZE = 8;

const FILTERS: { id: 'all' | UnifiedScanType; label: string }[] = [
  { id: 'all', label: 'All scans' },
  { id: 'chest_xray', label: 'Chest X-ray' },
  { id: 'skin_lesion', label: 'Skin' },
  { id: 'retina', label: 'Eye / retina' },
];

function statusBadgeVariant(status?: string): 'default' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch (status as ScanReportStatus) {
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

function resolveImage(item: UnifiedScanHistoryItem): string {
  if (item.source === 'chest_analyze') {
    return resolveChestScanImageUrl(item.imageUrl);
  }
  return resolveScanImageUrl(item.imageUrl);
}

interface PatientScanHistoryProps {
  immersive?: boolean;
  compact?: boolean;
  showFilters?: boolean;
  maxItems?: number;
}

export function PatientScanHistory({
  immersive = false,
  compact = false,
  showFilters = true,
  maxItems,
}: PatientScanHistoryProps) {
  const { data, isLoading, refetch } = useGetUnifiedScanHistoryQuery();
  const [filter, setFilter] = useState<'all' | UnifiedScanType>('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const items = data?.data ?? [];
    if (filter === 'all') return items;
    return items.filter((i) => i.scanType === filter);
  }, [data?.data, filter]);

  const limit = maxItems ?? (compact ? 5 : PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageItems = maxItems
    ? filtered.slice(0, maxItems)
    : filtered.slice(page * limit, page * limit + limit);

  if (isLoading) {
    return (
      <Card className={immersive ? 'mediscan-glass border-0' : ''}>
        <CardContent className={cn('py-12 text-center', immersive ? 'text-white/60' : 'text-muted')}>
          Loading scan history…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={immersive ? 'mediscan-glass border-0 shadow-none' : ''}>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className={cn('flex items-center gap-2', compact ? 'text-lg' : 'text-xl', immersive && 'text-white')}>
          <Scan className={cn('h-5 w-5', immersive ? 'text-cyan-400' : 'text-primary')} />
          AI scan history
        </CardTitle>
        <p className={cn('text-sm', immersive ? 'text-white/50' : 'text-muted')}>
          {filtered.length} scan{filtered.length !== 1 ? 's' : ''} saved to your profile — chest, skin & eye
        </p>
        {showFilters && filtered.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={filter === f.id ? 'default' : 'outline'}
                className={immersive && filter !== f.id ? 'border-white/20 text-white/80' : ''}
                onClick={() => {
                  setFilter(f.id);
                  setPage(0);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {filtered.length === 0 ? (
          <div className={cn('text-center py-8 space-y-3', immersive ? 'text-white/50' : 'text-muted')}>
            <History className="h-10 w-10 mx-auto opacity-40" />
            <p>No scans yet. Run a MediScan from the studio — results stay here for later.</p>
            <Button asChild variant={immersive ? 'outline' : 'default'} className={immersive ? 'border-white/30 text-white' : ''}>
              <Link to="/dashboard/mediscan">Open MediScan</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {pageItems.map((scan) => {
                const expanded = expandedId === `${scan.source}:${scan.id}`;
                const tier = scan.prediction
                  ? getPredictionTier(scan.prediction, scan.confidence ?? 0)
                  : 'attention';
                const detailLink =
                  scan.source === 'mediscan_report'
                    ? `/dashboard/mediscan?scan=${scan.id}`
                    : '/patient/scan-analysis';

                return (
                  <li
                    key={`${scan.source}-${scan.id}`}
                    className={cn(
                      'rounded-xl overflow-hidden',
                      immersive ? 'border border-white/10 bg-white/5' : 'border border-border'
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        'w-full flex flex-wrap items-center gap-3 p-4 text-left transition-colors',
                        immersive ? 'hover:bg-white/10 text-white' : 'hover:bg-background/80'
                      )}
                      onClick={() => setExpandedId(expanded ? null : `${scan.source}:${scan.id}`)}
                    >
                      <img
                        src={resolveImage(scan)}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover border shrink-0"
                      />
                      <div className="flex-1 min-w-[120px]">
                        <p className="font-medium">{scanTypeLabel(scan.scanType)}</p>
                        <p className="text-xs text-muted">
                          {scan.source === 'chest_analyze' ? formatChestScanDate(scan.createdAt) : formatScanDate(scan.createdAt)}
                        </p>
                      </div>
                      {scan.prediction && (
                        <Badge
                          variant={
                            scan.scanType === 'chest_xray'
                              ? chestScanBadgeVariant(scan.prediction)
                              : predictionBadgeVariant(tier)
                          }
                          className="shrink-0"
                        >
                          {scan.prediction}
                        </Badge>
                      )}
                      {scan.confidence != null && (
                        <span className="text-sm font-semibold tabular-nums shrink-0">
                          {scan.confidence.toFixed(0)}%
                        </span>
                      )}
                      {scan.status && (
                        <Badge variant={statusBadgeVariant(scan.status)} className="shrink-0 capitalize">
                          {SCAN_STATUS_LABELS[scan.status as ScanReportStatus] ?? scan.status}
                        </Badge>
                      )}
                      {scan.sharedWithDoctor && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Shared
                        </Badge>
                      )}
                      {expanded ? (
                        <ChevronUp className="h-5 w-5 text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted shrink-0" />
                      )}
                    </button>
                    {expanded && (
                      <div className={cn('px-4 pb-4 border-t', immersive ? 'border-white/10' : 'border-border')}>
                        {scan.explanation && (
                          <p className="text-sm text-muted py-3 line-clamp-4">{scan.explanation}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link to={detailLink}>View details</Link>
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/health-records">Health vault</Link>
                          </Button>
                        </div>
                        {scan.source === 'mediscan_report' && scan.status === 'ai_analyzed' && (
                          <div className="mt-3">
                            <ScanResultCard
                              report={
                                {
                                  _id: scan.id,
                                  scanType: scan.scanType,
                                  imageUrl: scan.imageUrl,
                                  prediction: scan.prediction,
                                  confidence: scan.confidence,
                                  status: (scan.status ?? 'ai_analyzed') as ScanReportStatus,
                                  patientId: '',
                                  createdAt: scan.createdAt,
                                  updatedAt: scan.createdAt,
                                } as ScanReport
                              }
                              onShared={() => refetch()}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {!maxItems && totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
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

            {compact && filtered.length > (maxItems ?? 5) && (
              <Button asChild variant="outline" className="w-full">
                <Link to="/patient/scan-history">View full scan history</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
