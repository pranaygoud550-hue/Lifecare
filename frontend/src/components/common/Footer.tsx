import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin,
  Smartphone, Stethoscope, Pill, Ambulance, FileText, Shield,
} from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();

  const patientLinks = [
    { to: '/doctors', label: t('nav.findDoctors') },
    { to: '/doctors', label: t('footer.videoConsultation') },
    { to: '/pharmacy', label: t('footer.orderMedicines') },
    { to: '/ambulance', label: t('footer.bookAmbulance') },
    { to: '/register', label: t('footer.createAccount') },
    { to: '/login', label: t('footer.signIn') },
  ];

  const doctorLinks = [
    { to: '/register', label: t('footer.joinDoctor') },
    { to: '/login', label: t('footer.doctorLogin') },
  ];

  const companyLinks = [
    { href: '#', label: t('footer.about') },
    { href: '#', label: t('footer.careers') },
    { href: '#', label: t('footer.press') },
    { href: '#', label: t('footer.privacy') },
    { href: '#', label: t('footer.terms') },
    { href: '#', label: t('footer.contact') },
  ];

  return (
    <footer className="bg-[#1a2332] text-white">
      <div className="container-custom py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl mb-4">
              <Heart className="h-7 w-7 fill-secondary text-secondary" />
              LifeCare+
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="p-2.5 rounded-full bg-white/10 hover:bg-primary transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-secondary" /> {t('footer.forPatients')}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {patientLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-secondary" /> {t('footer.forDoctors')}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {doctorLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
            <h4 className="font-semibold mt-6 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-secondary" /> {t('footer.company')}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {companyLinks.slice(0, 4).map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="hover:text-white transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.contactEmergency')}</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="tel:108" className="flex items-center gap-2 hover:text-red-400 font-semibold text-red-300">
                  <Ambulance className="h-4 w-4" />
                  {t('footer.emergency108')}
                </a>
              </li>
              <li>
                <a href="tel:18005433727" className="flex items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4 text-secondary" />
                  1800-543-3727
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-secondary shrink-0" />
                support@lifecare.com
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                Mumbai, Maharashtra, India
              </li>
            </ul>

            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" /> {t('footer.getApp')}
              </p>
              <div className="flex flex-col gap-2">
                <a href="#" className="text-xs bg-white/10 hover:bg-white/15 rounded-lg px-3 py-2 text-center transition-colors">
                  {t('footer.appStore')}
                </a>
                <a href="#" className="text-xs bg-white/10 hover:bg-white/15 rounded-lg px-3 py-2 text-center transition-colors">
                  {t('footer.googlePlay')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-10 pt-8 border-t border-white/10 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-400">
            <Pill className="h-4 w-4 text-secondary" />
            <span>{t('footer.licensedPharmacy')}</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-400">
            <Stethoscope className="h-4 w-4 text-secondary" />
            <span>{t('footer.verifiedDoctors')}</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-400">
            <Ambulance className="h-4 w-4 text-secondary" />
            <span>{t('footer.ambulanceNetwork')}</span>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} {t('footer.copyright')}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {companyLinks.slice(3).map((l) => (
              <a key={l.label} href={l.href} className="hover:text-slate-300">{l.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
