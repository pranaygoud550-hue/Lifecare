import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { openEmergency, setEmergencyStep } from '@/features/emergency/emergencySlice';
import { HelpComingView } from '@/components/emergency/HelpComingView';
import { Button } from '@/components/ui/button';

export function TransportStatusPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { activeBookingId } = useAppSelector((s) => s.emergency);

  useEffect(() => {
    if (!activeBookingId) return;
    dispatch(openEmergency());
    dispatch(setEmergencyStep('help-coming'));
  }, [activeBookingId, dispatch]);

  if (!activeBookingId) {
    return (
      <div className="container-custom py-16 text-center elder-text">
        <p className="text-xl mb-4">No active transport booking</p>
        <Button size="lg" onClick={() => navigate('/transport/book')}>Book a ride</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col bg-slate-950">
      <HelpComingView />
    </div>
  );
}
