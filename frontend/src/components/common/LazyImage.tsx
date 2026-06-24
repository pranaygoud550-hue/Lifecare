import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

const supportsNativeLazy = 'loading' in HTMLImageElement.prototype;

export function LazyImage({
  src,
  alt = '',
  className,
  fallbackClassName,
  ...props
}: LazyImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(supportsNativeLazy);

  useEffect(() => {
    if (supportsNativeLazy) return;
    const el = ref.current;
    if (!el) return;
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
