import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain, ScanLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ScanReport, ScanType } from '@/types/mediscan';
import { formatDate } from '@/lib/utils';

export function ScanHealthStrip({ scans }: { scans: ScanReport[] }) {
  const { t } = useTranslation();

  const LABELS: Record<ScanType, string> = {
    chest_xray: t('dashboard.scanChest'),
    skin_lesion: t('dashboard.scanSkin'),
    retina: t('dashboard.scanEyes'),
  };

  const latestByType = new Map<ScanType, ScanReport>();
  for (const s of scans) {
    if (!latestByType.has(s.scanType)) latestByType.set(s.scanType, s);
  }

  const types: ScanType[] = ['chest_xray', 'retina'];
  const items = types.map((type) => latestByType.get(type)).filter(Boolean) as ScanReport[];

  if (items.length === 0) return null;

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((scan) => (
        <Card key={scan._id} className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{LABELS[scan.scanType]}</p>
                <p className="text-xs text-muted truncate">{scan.prediction || t('dashboard.pending')}</p>
                <p className="text-[10px] text-muted mt-0.5">{formatDate(scan.createdAt)}</p>
              </div>
            </div>
            <Link to="/dashboard/mediscan" className="text-xs text-primary font-medium shrink-0 flex items-center gap-0.5">
              <ScanLine className="h-3.5 w-3.5" /> {t('dashboard.open')}
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
