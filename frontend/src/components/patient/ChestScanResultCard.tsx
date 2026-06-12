import { Link } from 'react-router-dom';
import { Share2, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  chestScanBadgeColor,
  chestScanBadgeVariant,
  resolveChestScanImageUrl,
} from '@/lib/chestScan';
import type { ChestScan } from '@/types/chestScan';

interface ChestScanResultCardProps {
  scan: ChestScan;
  thumbnailUrl?: string;
  onShare?: () => void;
  sharing?: boolean;
  shared?: boolean;
}

export function ChestScanResultCard({
  scan,
  thumbnailUrl,
  onShare,
  sharing,
  shared,
}: ChestScanResultCardProps) {
  const imageSrc = thumbnailUrl ?? resolveChestScanImageUrl(scan.imageUrl);
  const badgeVariant = chestScanBadgeVariant(scan.prediction);

  return (
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-xl">Analysis Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="mx-auto w-full max-w-[200px] shrink-0 overflow-hidden rounded-xl border bg-muted/30 p-2">
            <img
              src={imageSrc}
              alt="Uploaded chest X-ray"
              className="h-48 w-full rounded-lg object-cover"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Prediction</p>
              <Badge
                variant={badgeVariant}
                className={`px-4 py-2 text-base ${chestScanBadgeColor(scan.prediction)} text-white`}
              >
                {scan.prediction}
              </Badge>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-muted">Confidence</span>
                <span className="text-lg font-bold">{scan.confidence.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${chestScanBadgeColor(scan.prediction)}`}
                  style={{ width: `${Math.min(scan.confidence, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(scan.allPredictions).map(([label, score]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                >
                  <span>{label}</span>
                  <span className="font-medium">{score.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-primary/5 p-4">
          <p className="mb-1 text-sm font-semibold text-primary">AI Explanation</p>
          <p className="leading-relaxed text-foreground">{scan.explanation}</p>
        </div>

        <p className="text-xs leading-relaxed text-muted">{scan.disclaimer}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          {onShare && (
            <Button
              onClick={onShare}
              disabled={sharing || shared}
              className="flex-1"
              variant={shared ? 'secondary' : 'default'}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {shared ? 'Shared with Doctor' : sharing ? 'Sharing...' : 'Share with my Doctor'}
            </Button>
          )}
          <Button asChild variant="outline" className="flex-1">
            <Link to="/patient/scan-history">
              <History className="mr-2 h-4 w-4" />
              View Scan History
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
