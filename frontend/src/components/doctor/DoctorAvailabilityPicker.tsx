import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useGetDoctorAvailabilityQuery } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DoctorAvailabilityPickerProps {
  doctorId: string;
  onSlotSelect: (date: string, time: string) => void;
  selectedDate?: string;
  selectedTime?: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(startOffset: number): Date[] {
  const start = new Date();
  start.setDate(start.getDate() + startOffset * 7);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function DoctorAvailabilityPicker({
  doctorId,
  onSlotSelect,
  selectedDate,
  selectedTime,
}: DoctorAvailabilityPickerProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDate, setActiveDate] = useState(selectedDate || '');

  const weekDates = getWeekDates(weekOffset);
  const todayStr = new Date().toISOString().split('T')[0];

  const { data, isFetching } = useGetDoctorAvailabilityQuery(
    { id: doctorId, date: activeDate },
    { skip: !activeDate }
  );

  const slots = data?.data?.slots?.filter((s) => s.available) || [];

  const handleDateClick = (dateStr: string) => {
    if (dateStr < todayStr) return;
    setActiveDate(dateStr);
    onSlotSelect(dateStr, '');
  };

  const handleTimeClick = (time: string) => {
    if (activeDate) onSlotSelect(activeDate, time);
  };

  const monthLabel = weekDates[0].toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Pick date & time
        </h4>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((w) => w - 1)}
            disabled={weekOffset <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">{monthLabel}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((w) => w + 1)}
            disabled={weekOffset >= 3}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const isPast = dateStr < todayStr;
          const isSelected = activeDate === dateStr;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => handleDateClick(dateStr)}
              className={cn(
                'flex flex-col items-center py-2 px-1 rounded-xl border text-center transition-all',
                isPast && 'opacity-40 cursor-not-allowed',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-md'
                  : 'border-border bg-card hover:border-primary/50',
                isToday && !isSelected && 'ring-2 ring-secondary/50 ring-offset-1'
              )}
            >
              <span className="text-[10px] uppercase font-medium opacity-80">
                {DAY_LABELS[date.getDay()]}
              </span>
              <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      {activeDate && (
        <div>
          <p className="text-sm text-muted mb-3">
            Available slots for{' '}
            <span className="font-medium text-foreground">
              {new Date(activeDate + 'T12:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </p>
          {isFetching ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-9 w-16 bg-border rounded-lg animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center bg-background rounded-lg">
              No slots available this day. Try another date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => handleTimeClick(slot.time)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                    selectedTime === slot.time && selectedDate === activeDate
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary hover:bg-primary/5'
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
