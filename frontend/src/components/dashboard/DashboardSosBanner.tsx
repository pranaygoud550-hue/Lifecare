import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Links to profile SOS — location + nearest hospital + countdown dispatch */
export function DashboardSosBanner() {
  const { t } = useTranslation();

  return (
    <section
      className="rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-600 to-red-700 p-4 sm:p-5 text-white shadow-md"
      aria-label={t('dashboard.sosBannerTitle')}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-7 w-7 shrink-0 opacity-90" />
        <div className="flex-1">
          <p className="font-bold text-lg">{t('dashboard.sosBannerTitle')}</p>
          <p className="text-sm text-red-50/90 mt-1">{t('dashboard.sosBannerDesc')}</p>
        </div>
      </div>
      <Button
        variant="secondary"
        className="w-full mt-4 h-12 font-bold text-red-700 bg-white hover:bg-red-50"
        asChild
      >
        <Link to="/dashboard/profile">{t('dashboard.sosBannerCta')}</Link>
      </Button>
    </section>
  );
}
