import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppLanguage } from '@/i18n/config';

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.startsWith('te') ? 'te' : 'en') as AppLanguage;
  const next: AppLanguage = current === 'en' ? 'te' : 'en';

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('gap-1.5 font-medium', className)}
      onClick={() => i18n.changeLanguage(next)}
      title={t('nav.language')}
      aria-label={t('nav.language')}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-medium">{current === 'en' ? 'EN' : 'తెలుగు'}</span>
    </Button>
  );
}
