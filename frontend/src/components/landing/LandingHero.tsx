import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Shield, Clock, Video, Pill, ArrowRight } from 'lucide-react';
import { DemoLoginButtons } from '@/components/landing/DemoLoginButtons';
import { Button } from '@/components/ui/button';

export function LandingHero() {
  const { t } = useTranslation();

  const features = [
    t('home.featureVerified'),
    t('home.featureRx'),
    t('home.featureRecords'),
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#e8f4fd] via-white to-[#e6faf5]">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      <div className="container-custom relative py-12 md:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white border border-primary/20 text-primary px-4 py-1.5 text-sm font-medium shadow-sm mb-6">
              <Shield className="h-4 w-4" />
              {t('home.badge')}
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-foreground leading-[1.15] mb-5">
              {t('home.title')}{' '}
              <span className="text-primary">{t('home.titleHighlight')}</span>
            </h1>
            <p className="text-lg text-muted max-w-lg mb-8 leading-relaxed">
              {t('home.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link to="/doctors" className="flex-1 sm:flex-none">
                <Button size="lg" className="w-full h-12 md:h-14 px-8 rounded-xl text-base font-semibold gap-2">
                  <Search className="h-5 w-5" />
                  {t('home.findDoctor')}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login" className="flex-1 sm:flex-none">
                <Button variant="outline" size="lg" className="w-full h-12 md:h-14 rounded-xl bg-white">
                  {t('nav.getStarted')}
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/doctors">
                <Button variant="outline" className="gap-2 bg-white">
                  <Video className="h-4 w-4 text-primary" /> {t('nav.videoConsult')}
                </Button>
              </Link>
              <Link to="/pharmacy">
                <Button variant="outline" className="gap-2 bg-white">
                  <Pill className="h-4 w-4 text-secondary" /> {t('nav.orderMedicines')}
                </Button>
              </Link>
            </div>

            <div className="mb-8">
              <DemoLoginButtons />
            </div>
          </div>

          <div className="hidden lg:block relative">
            <div className="relative rounded-3xl bg-gradient-to-br from-primary to-[#0052cc] p-8 text-white shadow-2xl">
              <div className="absolute -top-4 -right-4 bg-white text-foreground rounded-2xl shadow-lg p-4 text-sm">
                <p className="font-bold text-2xl text-secondary">4.8★</p>
                <p className="text-muted text-xs">{t('home.patientRating')}</p>
              </div>
              <h3 className="text-2xl font-bold mb-2">{t('home.consultTitle')}</h3>
              <p className="text-white/80 text-sm mb-6">{t('home.consultModes')}</p>
              <ul className="space-y-3 text-sm">
                {features.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                <div><p className="text-2xl font-bold">10K+</p><p className="text-xs text-white/70">{t('home.doctorsLabel')}</p></div>
                <div><p className="text-2xl font-bold">24/7</p><p className="text-xs text-white/70">{t('home.supportLabel')}</p></div>
                <div><p className="text-2xl font-bold">8 min</p><p className="text-xs text-white/70">{t('home.ambulanceEta')}</p></div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-2xl shadow-lg p-4 flex items-center gap-3">
              <Clock className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-xl" />
              <div>
                <p className="font-semibold text-sm">{t('home.avgWait')}</p>
                <p className="text-xs text-muted">{t('home.avgWaitDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
