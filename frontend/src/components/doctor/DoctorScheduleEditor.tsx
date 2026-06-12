import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useGetMyDoctorAvailabilityQuery,
  useUpdateMyDoctorAvailabilityMutation,
} from '@/features/api/apiSlice';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DaySlot = { day: string; slots: Array<{ startTime: string; endTime: string }> };

function defaultWeek(): DaySlot[] {
  return WEEKDAYS.map((day) => ({
    day,
    slots: day === 'Sunday' ? [] : [{ startTime: '09:00', endTime: '18:00' }],
  }));
}

export function DoctorScheduleEditor() {
  const { data, isLoading } = useGetMyDoctorAvailabilityQuery();
  const [updateAvailability, { isLoading: saving }] = useUpdateMyDoctorAvailabilityMutation();
  const [schedule, setSchedule] = useState<DaySlot[]>(defaultWeek());

  useEffect(() => {
    const avail = data?.data as DaySlot[] | undefined;
    if (avail?.length) {
      const merged = WEEKDAYS.map((day) => {
        const found = avail.find((a) => a.day === day);
        return found ?? { day, slots: [] };
      });
      setSchedule(merged);
    }
  }, [data]);

  const toggleDay = (day: string, enabled: boolean) => {
    setSchedule((prev) =>
      prev.map((d) =>
        d.day === day
          ? { ...d, slots: enabled ? [{ startTime: '09:00', endTime: '18:00' }] : [] }
          : d
      )
    );
  };

  const updateSlot = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.day !== day || !d.slots[0]) return d;
        return { ...d, slots: [{ ...d.slots[0], [field]: value }] };
      })
    );
  };

  const handleSave = async () => {
    try {
      await updateAvailability({ availability: schedule }).unwrap();
      toast.success('Weekly schedule saved — patients see real slots');
    } catch {
      toast.error('Could not save schedule');
    }
  };

  if (isLoading) {
    return <div className="h-40 bg-muted animate-pulse rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Weekly availability
        </CardTitle>
        <p className="text-sm text-muted font-normal">
          Patients book only within your open hours. Closed days show no slots.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {schedule.map((row) => {
          const open = row.slots.length > 0;
          return (
            <div
              key={row.day}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border"
            >
              <label className="flex items-center gap-2 min-w-[140px] font-medium text-sm">
                <input
                  type="checkbox"
                  checked={open}
                  onChange={(e) => toggleDay(row.day, e.target.checked)}
                  className="rounded"
                />
                {row.day}
              </label>
              {open ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="time"
                    value={row.slots[0]?.startTime ?? '09:00'}
                    onChange={(e) => updateSlot(row.day, 'startTime', e.target.value)}
                    className="w-[130px] h-9"
                  />
                  <span className="text-muted text-sm">to</span>
                  <Input
                    type="time"
                    value={row.slots[0]?.endTime ?? '18:00'}
                    onChange={(e) => updateSlot(row.day, 'endTime', e.target.value)}
                    className="w-[130px] h-9"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted">Closed</span>
              )}
            </div>
          );
        })}
        <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save schedule'}
        </Button>
      </CardContent>
    </Card>
  );
}
