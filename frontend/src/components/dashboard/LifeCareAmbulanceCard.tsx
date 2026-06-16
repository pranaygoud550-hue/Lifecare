import { useTranslation } from 'react-i18next';
import { LifeBuoy, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/hooks/redux';
import { dispatchHospitalRide, dispatchNeedHelp } from '@/lib/needHelp';

/** Need Help card on patient dashboard — opens the unified help flow */
export function LifeCareAmbulanceCard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-700 to-sky-900 text-white shadow-lg">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl">
            <LifeBuoy className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold">{t('dashboard.needHelpTitle', 'Need Help?')}</h3>
            <p className="mt-1 text-sm text-white/85">
              {t(
                'dashboard.needHelpSubtitle',
                'Ambulance SOS, hospital ride, or video consult — we detect your location automatically.'
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-white text-sky-800 hover:bg-white/90"
                onClick={() => dispatchNeedHelp(dispatch)}
              >
                <LifeBuoy className="mr-1.5 h-4 w-4" />
                {t('dashboard.needHelp', 'Need Help')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
                onClick={() => dispatchHospitalRide(dispatch)}
              >
                <Building2 className="mr-1.5 h-4 w-4" />
                {t('dashboard.hospitalRide', 'Hospital ride')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
