import { Appointment } from '../models/index.js';
import { TIME_SLOTS } from '../utils/helpers.js';
import type { IUser } from '../models/User.js';

export interface NextAvailableSlot {
  date: string;
  time: string;
  label: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function slotInAvailability(
  slot: string,
  daySlots: Array<{ startTime: string; endTime: string }>
): boolean {
  return daySlots.some((s) => slot >= s.startTime && slot < s.endTime);
}

function formatLabel(date: Date, time: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Tomorrow, ${time}`;
  return `${target.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}

export async function getNextAvailableSlot(doctor: IUser): Promise<NextAvailableSlot | null> {
  const availability = doctor.doctorDetails?.availability;
  if (!availability?.length) return null;

  const now = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const target = new Date(now);
    target.setDate(target.getDate() + dayOffset);
    const dayName = DAY_NAMES[target.getDay()];
    const dayAvail = availability.find((a) => a.day === dayName);
    if (!dayAvail?.slots?.length) continue;

    const dateStart = new Date(target);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(target);
    dateEnd.setHours(23, 59, 59, 999);

    const booked = await Appointment.find({
      doctorId: doctor._id,
      scheduledDate: { $gte: dateStart, $lte: dateEnd },
      status: { $nin: ['cancelled'] },
    }).select('scheduledTime');

    const bookedSet = new Set(booked.map((b) => b.scheduledTime));
    const isToday = dayOffset === 0;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    for (const slot of TIME_SLOTS) {
      if (!slotInAvailability(slot, dayAvail.slots)) continue;
      if (isToday) {
        const [h, m] = slot.split(':').map(Number);
        if (h * 60 + m <= nowMins) continue;
      }
      if (!bookedSet.has(slot)) {
        return {
          date: dateStart.toISOString().split('T')[0],
          time: slot,
          label: formatLabel(target, slot),
        };
      }
    }
  }

  return null;
}

export async function isAvailableToday(doctor: IUser): Promise<boolean> {
  const today = new Date();
  const dayName = DAY_NAMES[today.getDay()];
  const dayAvail = doctor.doctorDetails?.availability?.find((a) => a.day === dayName);
  if (!dayAvail?.slots?.length) return false;

  const slot = await getNextAvailableSlot(doctor);
  if (!slot) return false;
  const todayStr = today.toISOString().split('T')[0];
  return slot.date === todayStr;
}
