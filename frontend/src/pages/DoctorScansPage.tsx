import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, Brain, LayoutDashboard } from 'lucide-react';
import { ScanAnalyticsDashboard } from '@/components/doctor/mediscan/ScanAnalyticsDashboard';
import { PendingScansTable } from '@/components/doctor/mediscan/PendingScansTable';
import { ScanReviewModal } from '@/components/doctor/mediscan/ScanReviewModal';
import { useGetDoctorScansQuery } from '@/features/api/apiSlice';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScanReport } from '@/types/mediscan';

const DOCTOR_TABS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/doctor/scans', label: 'AI Scans', icon: Brain },
];

export function DoctorScansPage() {
  const [reviewScan, setReviewScan] = useState<ScanReport | null>(null);
  const { data, refetch } = useGetDoctorScansQuery();

  const pendingQueue = useMemo(
    () =>
      (data?.data ?? []).filter((s) =>
        ['ai_analyzed', 'ai_unavailable'].includes(s.status)
      ),
    [data?.data]
  );

  const pendingCount = pendingQueue.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <Helmet>
        <title>AI Scans | LifeCare+ Doctor</title>
      </Helmet>
      <div className="border-b border-border bg-card/90 sticky top-16 z-30">
        <div className="container-custom">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Doctor dashboard">
            {DOCTOR_TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground hover:bg-background'
                  )
                }
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.label === 'AI Scans' && pendingCount > 0 && (
                  <Badge variant="warning" className="ml-1 min-w-[1.25rem] justify-center">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="container-custom py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Scans
          </h1>
          <p className="text-muted mt-1">
            Review MediScan AI results, confirm or override predictions, and finalize reports for patients.
          </p>
        </div>

        <ScanAnalyticsDashboard />

        <PendingScansTable onReview={setReviewScan} />
      </div>

      {reviewScan && (
        <ScanReviewModal
          scan={reviewScan}
          pendingQueue={pendingQueue}
          onClose={() => setReviewScan(null)}
          onReviewSubmitted={(next) => {
            void refetch();
            setReviewScan(next);
            if (!next) setReviewScan(null);
          }}
        />
      )}
    </div>
  );
}
