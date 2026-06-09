import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export function LazyImage({
  src,
  alt = '',
  className,
  fallbackClassName,
  ...props
}: LazyImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if ('loading' in HTMLImageElement.prototype) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span className={cn('relative inline-block overflow-hidden', className)}>
      {!loaded && (
        <span
          className={cn(
            'absolute inset-0 bg-border animate-pulse rounded-[inherit]',
            fallbackClassName
          )}
          aria-hidden
        />
      )}
      <img
        ref={ref}
        src={visible ? src : undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </span>
  );
}
