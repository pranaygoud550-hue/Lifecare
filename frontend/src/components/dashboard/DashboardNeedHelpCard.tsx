import { useTranslation } from 'react-i18next';
import { LifeBuoy, ChevronRight } from 'lucide-react';
import { useAppDispatch } from '@/hooks/redux';
import { dispatchHospitalRide } from '@/lib/needHelp';
import { Button } from '@/components/ui/button';

export function DashboardNeedHelpCard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <section className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-primary/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground">{t('dashboard.needHelpTitle')}</p>
          <p className="text-sm text-muted mt-0.5">{t('dashboard.needHelpDesc')}</p>
        </div>
      </div>
      <Button
        className="w-full mt-4 gap-2 bg-sky-600 hover:bg-sky-700 h-12 text-base font-semibold"
        onClick={() => dispatchHospitalRide(dispatch)}
      >
        {t('dashboard.needHelpCta')}
        <ChevronRight className="h-5 w-5" />
      </Button>
    </section>
  );
}
