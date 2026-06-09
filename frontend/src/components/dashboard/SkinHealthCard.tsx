import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ScanReport } from '@/types/mediscan';
import { formatDate } from '@/lib/utils';

export function SkinHealthCard({ scan }: { scan: ScanReport | null }) {
  const { t } = useTranslation();

  if (!scan || scan.scanType !== 'skin_lesion') {
    return (
      <Card className="border-violet-200/50 bg-gradient-to-br from-violet-50/80 to-background h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5 text-violet-600" />
            {t('dashboard.skinHealth')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">{t('dashboard.noSkinScanYet')}</p>
          <Link to="/dashboard/mediscan?mode=skin">
            <Button size="sm" className="gap-1 bg-violet-600 hover:bg-violet-700">
              <Camera className="h-4 w-4" /> {t('dashboard.startSkinCheck')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const advice = scan.skinCareAdvice;
  const analyzed = ['ai_analyzed', 'doctor_reviewed', 'final'].includes(scan.status);

  return (
    <Card className="border-violet-200/50 bg-gradient-to-br from-violet-50/80 to-background h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            {t('dashboard.skinHealth')}
          </CardTitle>
          {analyzed && (
            <Badge variant={advice?.severity === 'urgent' ? 'danger' : advice?.severity === 'moderate' ? 'warning' : 'success'}>
              {advice?.primaryConcern || scan.prediction || 'Analyzed'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted font-normal">{t('dashboard.lastScan')} · {formatDate(scan.createdAt)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {analyzed ? (
          <>
            <p className="text-sm font-medium">{advice?.summary || scan.prediction}</p>
            {advice?.whatYourSkinNeeds?.[0] && (
              <p className="text-sm text-muted">{advice.whatYourSkinNeeds[0]}</p>
            )}
            {scan.confidence != null && (
              <p className="text-xs text-muted">{t('dashboard.aiConfidence', { pct: scan.confidence.toFixed(0) })}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">{t('dashboard.scanProcessing')}</p>
        )}
        <Link to="/dashboard/mediscan" className="inline-flex items-center text-sm text-violet-700 font-medium hover:underline">
          {t('dashboard.viewSkinReport')} <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
