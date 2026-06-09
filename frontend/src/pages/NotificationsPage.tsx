import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/features/api/apiSlice';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationIcon, NOTIFICATION_FILTER_TYPES } from '@/components/common/notificationIcons';
import { formatTimeAgo } from '@/lib/timeAgo';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

const SCAN_TYPE_SPECIALTY: Record<string, string> = {
  chest_xray: 'Pulmonology',
  skin_lesion: 'Dermatology',
  retina: 'Ophthalmology',
};

function notificationDestination(n: Notification): string | null {
  const data = n.data ?? {};
  const scanId = typeof data.scanId === 'string' ? data.scanId : null;
  if (n.type === 'scan_urgent' || data.action === 'book_from_scan') {
    const params = new URLSearchParams({ fromScan: '1' });
    if (scanId) params.set('scanReportId', scanId);
    const scanType = typeof data.scanType === 'string' ? data.scanType : '';
    const spec = SCAN_TYPE_SPECIALTY[scanType];
    if (spec) params.set('specialty', spec);
    return `/doctors?${params.toString()}`;
  }
  if ((n.type === 'scan' || data.action === 'view_scan' || data.action === 'review_scan') && scanId) {
    return `/dashboard/mediscan?scan=${scanId}`;
  }
  if (n.type.startsWith('appointment')) return '/appointments';
  return null;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const { data, refetch } = useGetNotificationsQuery(
    filter === 'all' ? { limit: '100' } : { type: filter, limit: '100' }
  );
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  useSocket(useCallback(() => { refetch(); }, [refetch]));

  const notifications = data?.data || [];
  const unreadCount = data?.meta?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      await markRead(n._id);
      refetch();
    }
    const dest = notificationDestination(n);
    if (dest) navigate(dest);
  };

  const typeColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
    appointment: 'default',
    appointment_booked: 'default',
    appointment_reminder: 'warning',
    appointment_accepted: 'success',
    appointment_rejected: 'danger',
    prescription: 'secondary',
    ambulance: 'danger',
    wallet: 'success',
    order: 'success',
    system: 'default',
    promotional: 'warning',
    scan: 'secondary',
    scan_urgent: 'danger',
  };

  return (
    <div className="container-custom py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Notifications</h1>
          <p className="text-muted text-sm">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              await markAllRead();
              refetch();
            }}
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {NOTIFICATION_FILTER_TYPES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === f.id
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted hover:border-primary/50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-muted mt-2 text-sm">
              {filter === 'all' ? "You're all caught up!" : `No ${filter.replace(/_/g, ' ')} notifications`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: Notification) => (
            <Card
              key={n._id}
              className={cn(
                'cursor-pointer transition-colors hover:border-primary/40',
                !n.isRead && 'border-primary/30 bg-primary/5'
              )}
              onClick={() => handleNotificationClick(n)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2.5 rounded-lg shrink-0',
                      !n.isRead ? 'bg-primary/15 text-primary' : 'bg-muted/20 text-muted'
                    )}
                  >
                    <NotificationIcon type={n.type} className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium text-sm">{n.title}</h3>
                      <Badge variant={typeColors[n.type] || 'default'} className="text-[10px] capitalize">
                        {n.type.replace(/_/g, ' ')}
                      </Badge>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-muted">{n.message}</p>
                    <p className="text-xs text-muted mt-2">{formatTimeAgo(n.sentAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
