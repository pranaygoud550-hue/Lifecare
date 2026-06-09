import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WifiOff, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflinePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="p-4 rounded-full bg-muted/30 mb-6">
        <WifiOff className="h-12 w-12 text-muted" />
      </div>
      <Heart className="h-8 w-8 text-primary fill-primary mb-4" />
      <h1 className="text-2xl font-bold mb-2">{t('common.offline')}</h1>
      <p className="text-muted max-w-md mb-8">{t('common.offlineDesc')}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={() => window.location.reload()}>{t('common.search')}</Button>
        <Link to="/doctors">
          <Button variant="outline">{t('nav.findDoctors')}</Button>
        </Link>
      </div>
    </div>
  );
}
