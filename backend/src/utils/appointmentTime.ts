/** Combine stored date + "HH:mm" time into a single Date in local server TZ */
export function getAppointmentDateTime(scheduledDate: Date, scheduledTime: string): Date {
  const [hours, minutes] = scheduledTime.split(':').map((p) => parseInt(p, 10));
  const dt = new Date(scheduledDate);
  dt.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return dt;
}

export function formatDoctorName(profile?: { firstName?: string; lastName?: string }): string {
  const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  return name ? `Dr. ${name}` : 'Your doctor';
}
