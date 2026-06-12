import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, History, Plus } from 'lucide-react';
import { useGetMyChestScansQuery } from '@/features/api/apiSlice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  chestScanBadgeVariant,
  formatChestScanDate,
  resolveChestScanImageUrl,
} from '@/lib/chestScan';

export function ScanHistoryPage() {
  const { data, isLoading, isError } = useGetMyChestScansQuery();
  const scans = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <Helmet>
        <title>Scan History | LifeCare+</title>
      </Helmet>

      <div className="container-custom py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/patient/scan-analysis"
              className="mb-3 inline-flex items-center gap-2 text-sm text-muted hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Analysis
            </Link>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <History className="h-8 w-8 text-primary" />
              Scan History
            </h1>
            <p className="mt-1 text-muted">Your past chest X-ray AI screenings</p>
          </div>
          <Button asChild>
            <Link to="/patient/scan-analysis">
              <Plus className="mr-2 h-4 w-4" />
              New Scan
            </Link>
          </Button>
        </div>

        {isLoading && (
          <Card>
            <CardContent className="p-8 text-center text-muted">Loading scan history...</CardContent>
          </Card>
        )}

        {isError && (
          <Card>
            <CardContent className="p-8 text-center text-red-600">
              Could not load scan history. Please try again later.
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && scans.length === 0 && (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-muted">No scans yet. Upload your first chest X-ray to get started.</p>
              <Button asChild>
                <Link to="/patient/scan-analysis">Analyze a scan</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {scans.map((scan) => (
            <Card key={scan._id} className="overflow-hidden">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <img
                  src={resolveChestScanImageUrl(scan.imageUrl)}
                  alt={`Scan ${scan.prediction}`}
                  className="h-24 w-24 shrink-0 rounded-lg border object-cover"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={chestScanBadgeVariant(scan.prediction)} className="text-sm">
                      {scan.prediction}
                    </Badge>
                    <span className="text-sm font-semibold">{scan.confidence.toFixed(1)}% confidence</span>
                    {scan.sharedWithDoctor && (
                      <Badge variant="outline" className="text-xs">
                        Shared with doctor
                      </Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted">{scan.explanation}</p>
                  <p className="text-xs text-muted">{formatChestScanDate(scan.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
