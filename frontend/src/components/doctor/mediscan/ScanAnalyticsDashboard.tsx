import { Activity, Brain, Clock, Scan } from 'lucide-react';
import { useGetDoctorScanAnalyticsQuery } from '@/features/api/apiSlice';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ScanAnalyticsDashboardProps {
  className?: string;
}

export function ScanAnalyticsDashboard({ className }: ScanAnalyticsDashboardProps) {
  const { data, isLoading } = useGetDoctorScanAnalyticsQuery();

  const stats = data?.data;

  const items = [
    {
      label: 'Scans this month',
      value: isLoading ? '…' : String(stats?.totalScansThisMonth ?? 0),
      icon: Scan,
      color: 'text-primary',
    },
    {
      label: 'AI accuracy rate',
      value: isLoading ? '…' : `${stats?.aiAccuracyRate ?? 0}%`,
      sub: 'doctor agreed with AI',
      icon: Brain,
      color: 'text-secondary',
    },
    {
      label: 'Most common finding',
      value: isLoading ? '…' : stats?.mostCommonCondition ?? '—',
      icon: Activity,
      color: 'text-amber-600',
    },
    {
      label: 'Avg. review time',
      value: isLoading ? '…' : `${stats?.averageReviewTimeMinutes ?? 0} min`,
      icon: Clock,
      color: 'text-indigo-600',
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-background">
              <item.icon className={cn('h-5 w-5', item.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted uppercase tracking-wide">{item.label}</p>
              <p className="text-xl font-bold mt-0.5 truncate" title={item.value}>
                {item.value}
              </p>
              {item.sub && <p className="text-xs text-muted">{item.sub}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
