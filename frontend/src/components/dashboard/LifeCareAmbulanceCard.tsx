import { useTranslation } from 'react-i18next';
import { Ambulance, Building2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/hooks/redux';
import {
  openAmbulanceEmergencyFlow,
  openEmergency,
  openHospitalRideFlow,
} from '@/features/emergency/emergencySlice';

/** LifeCare-native ambulance & hospital transport — no external apps */
export function LifeCareAmbulanceCard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-red-600 to-red-800 text-white shadow-lg">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl">
            🚑
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold">{t('dashboard.ambulanceTitle', 'Need an Ambulance?')}</h3>
            <p className="mt-1 text-sm text-white/85">
              {t('dashboard.ambulanceSubtitle', 'Book emergency transport — nearest hospital detected automatically')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-white text-red-700 hover:bg-white/90"
                onClick={() => dispatch(openAmbulanceEmergencyFlow())}
              >
                <Ambulance className="mr-1.5 h-4 w-4" />
                {t('dashboard.ambulanceEmergency', 'Book Emergency')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
                onClick={() => dispatch(openHospitalRideFlow())}
              >
                <Building2 className="mr-1.5 h-4 w-4" />
                {t('dashboard.hospitalRide', 'Hospital ride')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
                onClick={() => dispatch(openEmergency())}
              >
                <Calendar className="mr-1.5 h-4 w-4" />
                {t('dashboard.allHelpOptions', 'All options')}
              </Button>
            </div>
            <Link
              to="/ambulance"
              className="mt-3 inline-block text-[11px] text-white/70 underline hover:text-white"
            >
              {t('dashboard.fullAmbulanceForm', 'Full ambulance request form')}
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
