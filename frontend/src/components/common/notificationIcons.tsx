import {
  Calendar,
  FileText,
  Ambulance,
  Wallet,
  Bell,
  Package,
  Car,
  AlertCircle,
  Scan,
  Droplets,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, typeof Bell> = {
  appointment: Calendar,
  appointment_booked: Calendar,
  appointment_reminder: Calendar,
  appointment_accepted: Calendar,
  appointment_rejected: Calendar,
  prescription: FileText,
  ambulance: Ambulance,
  wallet: Wallet,
  order: Package,
  transport: Car,
  system: Bell,
  promotional: AlertCircle,
  scan: Scan,
  scan_urgent: Scan,
  RAPIDCARE_UPDATE: Ambulance,
  emergency_sync: Ambulance,
  blood_emergency: Droplets,
};

export function NotificationIcon({
  type,
  className,
  data,
}: {
  type: string;
  className?: string;
  data?: Record<string, unknown>;
}) {
  if (type === 'RAPIDCARE_UPDATE' || (data?.icon as string) === '🚑') {
    return <span className={cn('text-base leading-none', className)} aria-hidden>🚑</span>;
  }
  const Icon = iconMap[type] || Bell;
  return <Icon className={cn('h-4 w-4 shrink-0', className)} />;
}

export const NOTIFICATION_FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'appointment', label: 'Appointments' },
  { id: 'appointment_booked', label: 'Booked' },
  { id: 'appointment_reminder', label: 'Reminders' },
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'ambulance', label: 'Ambulance' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'order', label: 'Orders' },
  { id: 'system', label: 'System' },
  { id: 'scan', label: 'MediScan' },
  { id: 'scan_urgent', label: 'Urgent scans' },
  { id: 'blood_emergency', label: 'Blood alerts' },
] as const;
