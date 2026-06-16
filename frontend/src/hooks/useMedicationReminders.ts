import { useEffect, useRef, useState } from 'react';
import { useGetMedicationRemindersQuery } from '@/features/api/apiSlice';
import { useAppSelector } from '@/hooks/redux';

function todayKey(time: string): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)}-${time}`;
}

async function showMedNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg?.active) {
        reg.active.postMessage({ type: 'MED_REMINDER', title, body, tag });
        return;
      }
    }
    new Notification(title, { body, icon: '/lifecare-icon.svg', tag });
  }
}

export function useMedicationRemindersEngine() {
  const user = useAppSelector((s) => s.auth.user);
  const firedRef = useRef<Set<string>>(new Set());
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden
  );

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const { data } = useGetMedicationRemindersQuery(undefined, {
    skip: !user || user.userType !== 'patient' || !tabVisible,
    pollingInterval: tabVisible ? 60_000 : undefined,
  });

  useEffect(() => {
    if (!user || user.userType !== 'patient') return;
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, [user]);

  useEffect(() => {
    if (!data?.data?.length) return;

    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const current = `${hh}:${mm}`;

      for (const reminder of data.data) {
        if (!reminder.isActive) continue;
        for (const time of reminder.times) {
          if (time !== current) continue;
          const key = `${reminder._id}-${todayKey(time)}`;
          if (firedRef.current.has(key)) continue;
          firedRef.current.add(key);
          const food = reminder.beforeAfterFood ? ` (${reminder.beforeAfterFood})` : '';
          void showMedNotification(
            `💊 ${reminder.medicineName}`,
            `Take ${reminder.dosage}${food}`,
            key
          );
        }
      }
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [data?.data]);
}
