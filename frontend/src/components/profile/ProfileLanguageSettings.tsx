import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AppLanguage } from '@/i18n/config';
import { LANG_PROFILE_SELECTED_KEY, SUPPORTED_LANGS } from '@/i18n/config';

const LANG_OPTIONS: { code: AppLanguage; labelKey: string; native: string }[] = [
  { code: 'en', labelKey: 'languages.en', native: 'English' },
  { code: 'te', labelKey: 'languages.te', native: 'తెలుగు' },
];

export function ProfileLanguageSettings() {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split('-')[0] || 'en') as AppLanguage;
  const active = SUPPORTED_LANGS.includes(current) ? current : 'en';

  const selectLanguage = (code: AppLanguage) => {
    try {
      localStorage.setItem(LANG_PROFILE_SELECTED_KEY, 'true');
    } catch {
      /* ignore */
    }
    void i18n.changeLanguage(code);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="h-5 w-5 text-primary" />
          {t('profile.languageTitle')}
        </CardTitle>
        <CardDescription>{t('profile.languageDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {LANG_OPTIONS.map((opt) => {
            const isActive = active === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => selectLanguage(opt.code)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-4 transition-all min-h-[88px]',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-card hover:border-primary/40 text-foreground'
                )}
                aria-pressed={isActive}
              >
                <span className="text-lg font-bold">{opt.native}</span>
                <span className="text-xs text-muted">{t(opt.labelKey)}</span>
                {isActive && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {t('profile.languageActive')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
