import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'lifecare-pwa-install-dismissed';

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[60] bg-card border border-border shadow-xl rounded-2xl p-4 animate-in slide-in-from-bottom-4">
      <button
        type="button"
        className="absolute top-2 right-2 p-1 text-muted hover:text-foreground"
        onClick={dismiss}
        aria-label={t('common.close')}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <div className="p-2 rounded-xl bg-primary/10 shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">{t('common.installApp')}</p>
          <p className="text-xs text-muted mt-0.5">{t('common.installAppDesc')}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" className="flex-1" onClick={handleInstall}>
          {t('common.install')}
        </Button>
        <Button size="sm" variant="outline" onClick={dismiss}>
          {t('common.notNow')}
        </Button>
      </div>
    </div>
  );
}
