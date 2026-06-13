import { LifeBuoy } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { openEmergency, openHospitalRideFlow } from '@/features/emergency/emergencySlice';
import { cn } from '@/lib/utils';

interface NeedHelpButtonProps {
  variant?: 'header' | 'fab' | 'fab-patient';
  className?: string;
}

export function NeedHelpButton({ variant = 'header', className }: NeedHelpButtonProps) {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  const handleClick = () => {
    if (isAuthenticated && user?.userType === 'patient') {
      dispatch(openHospitalRideFlow());
    } else {
      dispatch(openEmergency());
    }
  };

  if (variant === 'fab' || variant === 'fab-patient') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="I Need Help — hospital ride with location detected"
        className={cn(
          variant === 'fab-patient'
            ? 'fixed bottom-[5.75rem] left-4 z-40 flex items-center gap-2'
            : 'lg:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2',
          'bg-sky-600 text-white px-4 py-3 rounded-full shadow-lg',
          'font-bold text-sm min-h-[44px] hover:bg-sky-700',
          'focus:outline-none focus:ring-4 focus:ring-sky-300',
          className
        )}
      >
        <LifeBuoy className="h-5 w-5 shrink-0" aria-hidden />
        <span>Need Help</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="I Need Help — hospital transport"
      className={cn(
        'hidden lg:flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-red-600 text-white font-semibold text-sm min-h-[48px]',
        'animate-pulse-urgent hover:animate-none hover:bg-red-700 shadow-md',
        'focus:outline-none focus:ring-4 focus:ring-red-300',
        className
      )}
    >
      <LifeBuoy className="h-5 w-5" aria-hidden />
      I Need Help
    </button>
  );
}
