import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setGuest, skipGuest } from '@/features/emergency/emergencySlice';

export function GuestContactStep() {
  const dispatch = useAppDispatch();
  const { helpType } = useAppSelector((s) => s.emergency);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleContinue = () => {
    if (!name.trim() || phone.length < 10) return;
    dispatch(setGuest({ name: name.trim(), phone: phone.trim() }));
    dispatch(skipGuest());
  };

  return (
    <div className="flex flex-col flex-1 p-6 sm:p-8 max-w-lg mx-auto w-full">
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Quick contact</h2>
      <p className="text-lg text-white/80 mb-8">
        {helpType === 'hospital_ride'
          ? 'We need your details to book your hospital ride.'
          : 'We need your name and phone so the ambulance can reach you.'}
      </p>

      <div className="space-y-5 flex-1">
        <div>
          <Label htmlFor="guest-name" className="text-lg text-white">Your name</Label>
          <Input
            id="guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="mt-2 h-14 text-lg bg-white/95"
            autoComplete="name"
          />
        </div>
        <div>
          <Label htmlFor="guest-phone" className="text-lg text-white">Phone number</Label>
          <Input
            id="guest-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile"
            className="mt-2 h-14 text-lg bg-white/95"
            autoComplete="tel"
          />
        </div>
      </div>

      <Button
        size="lg"
        className="w-full h-14 text-lg mt-8 bg-white text-red-700 hover:bg-red-50"
        disabled={!name.trim() || phone.length < 10}
        onClick={handleContinue}
      >
        Continue
      </Button>
    </div>
  );
}
