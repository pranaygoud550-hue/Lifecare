import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppLanguage } from '@/i18n/config';
import { LANG_LABELS, SUPPORTED_LANGS } from '@/i18n/config';

export function LanguageSelector({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split('-')[0] || 'en') as AppLanguage;
  const value = SUPPORTED_LANGS.includes(current) ? current : 'en';

  return (
    <label
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-sm',
        className
      )}
      title={t('languages.choose')}
    >
      <Languages className="h-4 w-4 text-muted shrink-0" aria-hidden />
      <span className="sr-only">{t('languages.choose')}</span>
      <select
        value={value}
        onChange={(e) => i18n.changeLanguage(e.target.value as AppLanguage)}
        className="bg-transparent font-medium text-foreground text-xs uppercase tracking-wide cursor-pointer focus:outline-none pr-0.5 max-w-[5.5rem]"
        aria-label={t('languages.choose')}
      >
        {SUPPORTED_LANGS.map((code) => (
          <option key={code} value={code}>
            {LANG_LABELS[code]} — {t(`languages.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
