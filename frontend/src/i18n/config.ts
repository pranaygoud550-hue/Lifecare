import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import te from './locales/te.json';

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
    // Old header-level translator choices should not define the default language.
    // Only languages selected from Profile settings persist across reloads.
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

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGS],
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  const normalized = normalizeLanguage(lng);
  document.documentElement.lang = normalized;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
});

document.documentElement.lang = normalizeLanguage(i18n.language);

export default i18n;
