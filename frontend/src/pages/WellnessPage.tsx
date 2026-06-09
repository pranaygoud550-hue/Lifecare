import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { WellnessDietPanel } from '@/components/wellness/WellnessDietPanel';

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
    <div className="container-custom py-8">
      <Helmet>
        <title>Wellness & Diet Plan | LifeCare+</title>
        <meta
          name="description"
          content="Personalized diet and lifestyle guidance from your vitals, medical history, and MediScan on LifeCare+."
        />
      </Helmet>
      <WellnessDietPanel />
    </div>
  );
}
