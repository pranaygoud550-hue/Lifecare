import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Salad } from 'lucide-react';
import { WellnessDietPanel } from '@/components/wellness/WellnessDietPanel';
import { DoctorCarePlansCard } from '@/components/patient/DoctorCarePlansCard';
import { PositivePageShell } from '@/components/common/PositivePageShell';
import { SectionHero } from '@/components/common/SectionHero';
import { Badge } from '@/components/ui/badge';

export function WellnessPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash === '#log-meals') {
      const el = document.getElementById('log-meals');
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }, [hash]);

  return (
    <div className="wellness-page min-h-screen pb-6">
      <Helmet>
        <title>Wellness & Diet Plan | LifeCare+</title>
        <meta
          name="description"
          content="Personalized diet and lifestyle guidance from your vitals, medical history, and MediScan on LifeCare+."
        />
      </Helmet>

      <div className="container-custom pt-4 sm:pt-6">
        <PositivePageShell className="space-y-6">
          <SectionHero
          icon={Salad}
          theme="wellness"
          title="Wellness & Diet"
          subtitle="Your cheerful nutrition coach — eat well, feel great, stay on track."
          badge={
            <Badge className="bg-white/25 text-white border-white/35 hover:bg-white/25">
              Made just for you ✨
            </Badge>
          }
        />

        <DoctorCarePlansCard />
        <WellnessDietPanel />
        </PositivePageShell>
      </div>
    </div>
  );
}
