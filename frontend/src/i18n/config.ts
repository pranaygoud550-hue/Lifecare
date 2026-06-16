import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

export const LANG_STORAGE_KEY = 'lifecare-lang';
export const LANG_PROFILE_SELECTED_KEY = 'lifecare-lang-profile-selected';

export const SUPPORTED_LANGS = ['en', 'te'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<AppLanguage, string> = {
  en: 'EN',
  te: 'తెలుగు',
};

function normalizeLanguage(lng: string | undefined): AppLanguage {
  if (!lng) return 'en';
  const base = lng.split('-')[0];
  if (base === 'te') return 'te';
  return 'en';
}

function getStoredLanguage(): AppLanguage {
  try {
    if (localStorage.getItem(LANG_PROFILE_SELECTED_KEY) !== 'true') {
      localStorage.setItem(LANG_STORAGE_KEY, 'en');
      return 'en';
    }
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'te') return 'te';
    if (stored === 'en') return 'en';
  } catch {
    /* ignore */
  }
  return 'en';
}

async function ensureLanguageBundle(lng: AppLanguage): Promise<void> {
  if (lng === 'te' && !i18n.hasResourceBundle('te', 'translation')) {
    const te = await import('./locales/te.json');
    i18n.addResourceBundle('te', 'translation', te.default);
  }
}

const initialLang = getStoredLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: initialLang === 'te' ? 'en' : initialLang,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGS],
  interpolation: { escapeValue: false },
});

if (initialLang === 'te') {
  void ensureLanguageBundle('te').then(() => i18n.changeLanguage('te'));
}

i18n.on('languageChanged', (lng) => {
  const normalized = normalizeLanguage(lng);
  document.documentElement.lang = normalized;
  void ensureLanguageBundle(normalized);
  try {
    localStorage.setItem(LANG_STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
});

document.documentElement.lang = normalizeLanguage(i18n.language);

export default i18n;
