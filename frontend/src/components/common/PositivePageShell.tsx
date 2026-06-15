import { cn } from '@/lib/utils';

/** Wraps page sections with gentle staggered entrance animations — feels welcoming, not heavy */
export function PositivePageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('lc-stagger-children', className)}>{children}</div>;
}

/** Single block that pops in with a happy bounce */
export function PositiveReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn('lc-card-pop', className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
