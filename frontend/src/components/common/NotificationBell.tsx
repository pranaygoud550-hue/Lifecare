import { useState, useCallback } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { api } from '@/features/api/apiSlice';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/features/api/apiSlice';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { NotificationIcon } from '@/components/common/notificationIcons';
import { formatTimeAgo } from '@/lib/timeAgo';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

export function NotificationBell() {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data, refetch } = useGetNotificationsQuery({ limit: '15' });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const notifications = data?.data || [];
  const unreadCount = data?.meta?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  useSocket(
    useCallback(
      (notification: Notification) => {
        toast.info(notification.title, { autoClose: 4000 });
        dispatch(api.util.invalidateTags(['Notifications']));
      },
      [dispatch]
    )
  );

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await markRead(n._id);
      refetch();
    }
    setOpen(false);
    if (n.type.includes('appointment')) navigate('/appointments');
    else if (n.type === 'prescription') navigate('/prescriptions');
    else if (n.type === 'wallet') navigate('/wallet');
    else if (n.type === 'ambulance') navigate('/emergency');
    else if (n.type === 'RAPIDCARE_UPDATE' || n.type === 'emergency_sync') {
      navigate('/dashboard?tab=emergency');
    }
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="relative" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <>
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" aria-hidden />
            <span className="sr-only">{unreadCount} unread</span>
          </>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-2 w-[22rem] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="text-xs text-primary font-medium hover:underline"
                  onClick={async () => {
                    await markAllRead();
                    refetch();
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <p className="p-6 text-sm text-muted text-center">No notifications yet</p>
              ) : (
                notifications.slice(0, 12).map((n) => (
                  <button
                    key={n._id}
                    type="button"
                    className={cn(
                      'w-full text-left p-3 border-b border-border last:border-0 flex gap-3 hover:bg-background transition-colors',
                      !n.isRead && 'bg-primary/5'
                    )}
                    onClick={() => handleClick(n)}
                  >
                    <div
                      className={cn(
                        'mt-0.5 p-2 rounded-lg shrink-0',
                        !n.isRead ? 'bg-primary/15 text-primary' : 'bg-muted/30 text-muted'
                      )}
                    >
                      <NotificationIcon type={n.type} data={n.data as Record<string, unknown>} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted mt-1">{formatTimeAgo(n.sentAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full shrink-0 mt-2',
                          (n.type === 'RAPIDCARE_UPDATE' && (n.data as { urgent?: boolean })?.urgent)
                            ? 'bg-red-500'
                            : 'bg-primary'
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                ))
              )}
            </div>
            <Link
              to="/notifications"
              className="block py-3 text-center text-sm font-medium text-primary hover:bg-background border-t border-border"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
