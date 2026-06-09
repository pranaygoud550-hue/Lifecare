import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Ambulance, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EMERGENCY_PHONE = '108';
const HELPLINE = '1800-543-3727';

export function EmergencySOSBanner() {
  const { t } = useTranslation();

  return (
    <section className="py-0">
      <div className="container-custom py-8 md:py-0">
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-10">
            <div className="flex items-start gap-4 text-center md:text-left">
              <div className="hidden sm:flex p-4 rounded-2xl bg-white/15 animate-pulse">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <div>
                <p className="text-red-100 text-sm font-semibold uppercase tracking-wider mb-1">
                  {t('emergency.badge')}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  {t('emergency.title')}
                </h2>
                <p className="text-red-50 text-sm md:text-base max-w-lg">
                  {t('emergency.desc')}
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                  <a
                    href={`tel:${EMERGENCY_PHONE}`}
                    className="inline-flex items-center gap-2 text-xl md:text-2xl font-bold hover:underline"
                  >
                    <Phone className="h-6 w-6" />
                    {EMERGENCY_PHONE}
                  </a>
                  <span className="text-red-200 hidden sm:inline">|</span>
                  <a
                    href={`tel:${HELPLINE.replace(/-/g, '')}`}
                    className="inline-flex items-center gap-2 text-lg font-semibold text-red-50 hover:text-white"
                  >
                    {t('emergency.helpline')}: {HELPLINE}
                  </a>
                </div>
              </div>
            </div>

            <Link to="/ambulance" className="shrink-0 w-full md:w-auto">
              <Button
                size="lg"
                className="w-full md:w-auto h-14 px-8 bg-white text-red-600 hover:bg-red-50 font-bold text-base gap-2 rounded-xl shadow-lg"
              >
                <Ambulance className="h-5 w-5" />
                {t('emergency.cta')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
