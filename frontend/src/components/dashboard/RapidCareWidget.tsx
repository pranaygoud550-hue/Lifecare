import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ambulance, Calendar, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/hooks/redux';
import { useCreateRapidCarePrefillTokenMutation } from '@/features/api/apiSlice';

const RAPIDCARE_URL = import.meta.env.VITE_RAPIDCARE_URL || 'http://localhost:3000';

export function RapidCareWidget() {
  const { t } = useTranslation();
  const { user } = useAppSelector((s) => s.auth);
  const [modalOpen, setModalOpen] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  const [createToken, { isLoading }] = useCreateRapidCarePrefillTokenMutation();

  async function openBooking(type: 'emergency' | 'scheduled') {
    let url = `${RAPIDCARE_URL}/book?type=${type}`;
    if (user) {
      const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ');
      let age = '';
      if (user.profile?.dateOfBirth) {
        const yrs = (Date.now() - new Date(user.profile.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000);
        age = String(Math.floor(yrs));
      }
      const q = new URLSearchParams({
        type,
        name,
        phone: user.phone || '',
        age,
        allergies: user.medicalHistory?.allergies?.join(', ') || '',
        lifecarePatientId: user._id || '',
      });
      try {
        await createToken().unwrap();
      } catch {
        // token optional for prefill
      }
      url = `${RAPIDCARE_URL}/book?${q.toString()}`;
    }
    setIframeUrl(url);
    setModalOpen(true);
  }

  return (
    <>
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-red-600 to-red-800 text-white shadow-lg">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl">
              🚑
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold">{t('dashboard.rapidcareTitle', 'Need an Ambulance?')}</h3>
              <p className="mt-1 text-sm text-white/85">
                {t('dashboard.rapidcareSubtitle', 'Book in 60 seconds — powered by RapidCare')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isLoading}
                  className="bg-white text-red-700 hover:bg-white/90"
                  onClick={() => openBooking('emergency')}
                >
                  <Ambulance className="mr-1.5 h-4 w-4" />
                  {t('dashboard.rapidcareEmergency', 'Book Emergency')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isLoading}
                  className="border-white/40 bg-transparent text-white hover:bg-white/10"
                  onClick={() => openBooking('scheduled')}
                >
                  <Calendar className="mr-1.5 h-4 w-4" />
                  {t('dashboard.rapidcareSchedule', 'Schedule')}
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-white/60">Powered by RapidCare</p>
            </div>
          </div>
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-semibold text-foreground">RapidCare Booking</p>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe title="RapidCare booking" src={iframeUrl} className="min-h-0 flex-1 w-full border-0" />
          </div>
        </div>
      )}
    </>
  );
}
