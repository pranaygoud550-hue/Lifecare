/** Build a Google Calendar "add event" URL for an appointment. */
export function buildGoogleCalendarUrl(opts: {
  title: string;
  date: string;
  time: string;
  durationMinutes?: number;
  description?: string;
  location?: string;
}): string {
  const { title, date, time, durationMinutes = 30, description = '', location = '' } = opts;

  const [hours, minutes] = time.split(':').map(Number);
  const start = new Date(date);
  start.setHours(hours, minutes || 0, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
