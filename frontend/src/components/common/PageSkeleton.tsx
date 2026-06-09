import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  variant?: 'default' | 'dashboard' | 'list';
  className?: string;
}

export function PageSkeleton({ variant = 'default', className }: PageSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className={cn('container-custom py-8 space-y-4', className)}>
        <div className="h-10 w-64 bg-border rounded-lg animate-pulse" />
        <div className="h-5 w-96 max-w-full bg-border rounded animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-border rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={cn('container-custom py-8', className)}>
        <div className="flex gap-4 mb-8">
          <div className="h-16 w-16 rounded-full bg-border animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-8 w-48 bg-border rounded animate-pulse" />
            <div className="h-4 w-32 bg-border rounded animate-pulse" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-[50vh] flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm text-muted animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
