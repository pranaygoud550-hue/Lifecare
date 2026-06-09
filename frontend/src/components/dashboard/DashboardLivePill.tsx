import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Video } from 'lucide-react';

export function DashboardLivePill({ liveCount }: { liveCount: number }) {
  const { t } = useTranslation();
  if (liveCount <= 0) return null;

  return (
    <Link
      to="/live-checkup"
      className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm hover:bg-red-100/80 transition-colors"
    >
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-900">
          {t('dashboard.liveConsultReady', { count: liveCount })}
        </p>
        <p className="text-xs text-red-800/80">{t('dashboard.liveConsultHint')}</p>
      </div>
      <Video className="h-5 w-5 text-red-600 shrink-0" />
    </Link>
  );
}
