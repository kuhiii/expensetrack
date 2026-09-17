/**
 * Date formatting, done by hand rather than through toLocaleDateString:
 * Hermes' Intl support varies by platform, so this keeps output identical
 * everywhere — and already lowercase, matching the app's voice.
 */

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTHS_FULL = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** e.g. "sat, 2 aug · 10:24 pm" */
export function formatWhen(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const hours24 = d.getHours();
  const hour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minute = String(d.getMinutes()).padStart(2, '0');
  const meridiem = hours24 < 12 ? 'am' : 'pm';
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} · ${hour}:${minute} ${meridiem}`;
}

/** e.g. "august 2026", or just "august" when it's the current year. */
export function formatMonthLabel(year: number, monthIndex: number): string {
  const now = new Date();
  const label = MONTHS_FULL[monthIndex];
  return year === now.getFullYear() ? label : `${label} ${year}`;
}
