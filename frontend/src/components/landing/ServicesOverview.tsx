import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Stethoscope, Video, Pill, Ambulance, Home, FileText } from 'lucide-react';

export function ServicesOverview() {
  const { t } = useTranslation();

  const services = [
    {
      icon: Stethoscope,
      title: t('services.inClinic'),
      description: t('services.inClinicDesc'),
      link: '/doctors',
      accent: 'border-l-primary',
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      icon: Video,
      title: t('services.online'),
      description: t('services.onlineDesc'),
      link: '/doctors',
      accent: 'border-l-secondary',
      iconBg: 'bg-secondary/10 text-secondary',
    },
    {
      icon: Pill,
      title: t('services.pharmacy'),
      description: t('services.pharmacyDesc'),
      link: '/pharmacy',
      accent: 'border-l-purple-500',
      iconBg: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Ambulance,
      title: t('services.emergency'),
      description: t('services.emergencyDesc'),
      link: '/ambulance',
      accent: 'border-l-red-500',
      iconBg: 'bg-red-100 text-red-600',
    },
    {
      icon: Home,
      title: t('services.homeVisit'),
      description: t('services.homeVisitDesc'),
      link: '/doctors?type=homeVisit',
      accent: 'border-l-amber-500',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      icon: FileText,
      title: t('services.records'),
      description: t('services.recordsDesc'),
      link: '/register',
      accent: 'border-l-cyan-500',
      iconBg: 'bg-cyan-100 text-cyan-600',
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('services.title')}</h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            {t('services.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <Link
              key={s.title}
              to={s.link}
              className={`group block p-6 rounded-2xl bg-white border border-border border-l-4 ${s.accent} hover:shadow-lg transition-all hover:-translate-y-0.5`}
            >
              <div className={`inline-flex p-3 rounded-xl ${s.iconBg} mb-4`}>
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{s.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{s.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
