export const SCHOOL_TIME_ZONE = 'Africa/Accra';

/**
 * Today's date at the school as `YYYY-MM-DD`. Uses the school's time zone explicitly, never the
 * server's or the phone's local time.
 */
export function schoolToday(now: Date = new Date(), timeZone: string = SCHOOL_TIME_ZONE): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** A date-only value (`YYYY-MM-DD`) or timestamp as the school writes it: `DD/MM/YYYY`. */
export function formatDate(value: string): string {
  const date = value.length === 10 ? value : schoolToday(new Date(value));
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
