import { useMedicationRemindersEngine } from '@/hooks/useMedicationReminders';

/** Invisible — runs browser notification scheduler for active medicine reminders. */
export function MedicationReminderEngine() {
  useMedicationRemindersEngine();
  return null;
}
