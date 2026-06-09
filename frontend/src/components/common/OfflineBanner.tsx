import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="bg-amber-500 text-amber-950 text-center text-sm py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>{t('common.offline')} — {t('common.offlineDesc')}</span>
    </div>
  );
}
