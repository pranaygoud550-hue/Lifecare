import { useState } from 'react';
import { toast } from 'react-toastify';
import { Plus } from 'lucide-react';
import { useLogVitalMutation } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiError';
import type { VitalType } from '@/types';

const VITAL_TYPES: { id: VitalType; label: string }[] = [
  { id: 'blood_pressure', label: 'Blood pressure' },
  { id: 'blood_sugar', label: 'Blood sugar' },
  { id: 'weight', label: 'Weight' },
  { id: 'heart_rate', label: 'Heart rate' },
  { id: 'oxygen', label: 'Oxygen' },
];

function toLocalDatetimeValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VitalLogForm({
  onLogged,
  prominent = false,
}: {
  onLogged?: () => void;
  prominent?: boolean;
}) {
  const [type, setType] = useState<VitalType>('blood_pressure');
  const [recordedAt, setRecordedAt] = useState(toLocalDatetimeValue());
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [glucoseMeal, setGlucoseMeal] = useState<'fasting' | 'post_meal'>('fasting');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const [logVital, { isLoading }] = useLogVitalMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = {
        type,
        recordedAt: new Date(recordedAt).toISOString(),
        notes: notes || undefined,
      };

      if (type === 'blood_pressure') {
        body.systolic = Number(systolic);
        body.diastolic = Number(diastolic);
      } else if (type === 'blood_sugar') {
        body.glucose = Number(glucose);
        body.glucoseMeal = glucoseMeal;
      } else {
        body.value = Number(value);
        body.unit = type === 'weight' ? 'kg' : type === 'oxygen' ? '%' : 'bpm';
      }

      await logVital(body).unwrap();
      toast.success('Reading saved — your diet plan is updating');
      onLogged?.();
      setNotes('');
      if (type === 'blood_pressure') {
        setSystolic('');
        setDiastolic('');
      } else if (type === 'blood_sugar') {
        setGlucose('');
      } else {
        setValue('');
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(getApiErrorMessage(error, 'Failed to save reading'));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'space-y-4 p-4 rounded-xl border bg-card',
        prominent ? 'border-primary/40 shadow-md p-5 sm:p-6' : 'border-border'
      )}
    >
      <p className={cn('font-semibold flex items-center gap-2', prominent && 'text-lg')}>
        <Plus className="h-4 w-4 text-primary" />
        {prominent ? 'Enter BP, sugar, heart rate, or oxygen' : 'Log a reading'}
      </p>

      <div className="flex flex-wrap gap-2">
        {VITAL_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium border min-h-[40px]',
              type === t.id ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <Label htmlFor="vital-datetime">Date & time</Label>
        <Input
          id="vital-datetime"
          type="datetime-local"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          className="mt-1"
          required
        />
      </div>

      {type === 'blood_pressure' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sys">Systolic (top)</Label>
            <Input
              id="sys"
              type="number"
              placeholder="120"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="dia">Diastolic (bottom)</Label>
            <Input
              id="dia"
              type="number"
              placeholder="80"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              className="mt-1"
              required
            />
          </div>
        </div>
      )}

      {type === 'blood_sugar' && (
        <>
          <div className="flex gap-2">
            {(['fasting', 'post_meal'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setGlucoseMeal(m)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border',
                  glucoseMeal === m ? 'bg-primary/10 border-primary text-primary' : 'border-border'
                )}
              >
                {m === 'fasting' ? 'Fasting' : 'Post-meal'}
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="glucose">Blood sugar (mg/dL)</Label>
            <Input
              id="glucose"
              type="number"
              placeholder="95"
              value={glucose}
              onChange={(e) => setGlucose(e.target.value)}
              className="mt-1"
              required
            />
          </div>
        </>
      )}

      {(type === 'weight' || type === 'heart_rate' || type === 'oxygen') && (
        <div>
          <Label htmlFor="vital-value">
            {type === 'weight' ? 'Weight (kg)' : type === 'heart_rate' ? 'Heart rate (bpm)' : 'Oxygen SpO₂ (%)'}
          </Label>
          <Input
            id="vital-value"
            type="number"
            step={type === 'weight' ? '0.1' : '1'}
            placeholder={type === 'weight' ? '70' : type === 'heart_rate' ? '72' : '98'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1"
            required
          />
        </div>
      )}

      <div>
        <Label htmlFor="vital-notes">Notes (optional)</Label>
        <Input
          id="vital-notes"
          placeholder="e.g. after morning walk"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save reading'}
      </Button>
    </form>
  );
}
