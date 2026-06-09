import { useTranslation } from 'react-i18next';
import { ShieldCheck, Award, Truck, Headphones } from 'lucide-react';

export function TrustStrip() {
  const { t } = useTranslation();

  const items = [
    { icon: ShieldCheck, label: t('trust.verifiedDoctors'), sub: t('trust.verifiedSub') },
    { icon: Award, label: t('trust.qualityCare'), sub: t('trust.qualitySub') },
    { icon: Truck, label: t('trust.fastDelivery'), sub: t('trust.fastSub') },
    { icon: Headphones, label: t('trust.support247'), sub: t('trust.supportSub') },
  ];

  return (
    <section className="border-y border-border bg-white py-6">
      <div className="container-custom">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 justify-center md:justify-start">
              <div className="p-2.5 rounded-xl bg-primary/5 text-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
