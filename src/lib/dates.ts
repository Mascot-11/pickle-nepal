/**
 * Date/time helpers scoped to Nepal (REQUIREMENT.md §5.4).
 *
 * All persisted values are UTC instants. The server interprets the "date" and
 * "HH:mm" strings a user submits as *Nepal wall-clock time*, so a player in
 * Pokhara and the server in UTC agree on what "Saturday 6pm" means.
 */

import { TIMEZONE } from "@/lib/nepal";

const KATHMANDU_OFFSET_MINUTES = 345; // UTC+05:45, no DST

/** Kathmandu local time expressed as "YYYY-MM-DD" and "HH:mm". */
export function toNepalParts(date: Date): { date: string; time: string; dayOfWeek: number } {
  const shifted = new Date(date.getTime() + KATHMANDU_OFFSET_MINUTES * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}`, dayOfWeek: shifted.getUTCDay() };
}

/**
 * Builds a UTC instant from a Nepal wall-clock date and time.
 * `date`: YYYY-MM-DD, `time`: HH:mm
 */
export function fromNepalParts(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm);
  return new Date(utcMs - KATHMANDU_OFFSET_MINUTES * 60 * 1000);
}

export function startOfNepalDay(date: Date): Date {
  const { date: day } = toNepalParts(date);
  return fromNepalParts(day, "00:00");
}

export function endOfNepalDay(date: Date): Date {
  const { date: day } = toNepalParts(date);
  return fromNepalParts(day, "23:59");
}

export function addDaysToNepalDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

/** Start of the Nepal weekend (Saturday) for the given instant. */
export function startOfNepalWeekend(now: Date): Date {
  const { date, dayOfWeek } = toNepalParts(now);
  // Saturday = 6 in JS getUTCDay
  const daysSinceSaturday = dayOfWeek >= 6 ? dayOfWeek - 6 : dayOfWeek + 1;
  const saturday = addDaysToNepalDate(date, -daysSinceSaturday);
  return fromNepalParts(saturday, "00:00");
}

export function endOfNepalWeekend(now: Date): Date {
  const { date, dayOfWeek } = toNepalParts(now);
  const daysSinceSaturday = dayOfWeek >= 6 ? dayOfWeek - 6 : dayOfWeek + 1;
  const sunday = addDaysToNepalDate(date, -daysSinceSaturday + 1);
  return fromNepalParts(sunday, "23:59");
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_SHORT_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
});

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  weekday: "short",
});

export function formatDate(value: Date | string): string {
  return DATE_FMT.format(new Date(value));
}

export function formatDateShort(value: Date | string): string {
  return DATE_SHORT_FMT.format(new Date(value));
}

export function formatTime(value: Date | string): string {
  return TIME_FMT.format(new Date(value));
}

export function formatWeekday(value: Date | string): string {
  return WEEKDAY_FMT.format(new Date(value));
}

export function formatTimeRange(start: Date | string, end: Date | string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDateTime(value: Date | string): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** "Today", "Tomorrow", "Saturday, 12 Oct" — used on cards (§20). */
export function relativeDayLabel(value: Date | string, now = new Date()): string {
  const target = new Date(value);
  const { date: targetDate } = toNepalParts(target);
  const { date: todayDate } = toNepalParts(now);
  if (targetDate === todayDate) return "Today";
  if (targetDate === addDaysToNepalDate(todayDate, 1)) return "Tomorrow";
  if (targetDate === addDaysToNepalDate(todayDate, 2)) return "Day after tomorrow";
  const { date: yesterday } = toNepalParts(new Date(now.getTime() - 86400000));
  if (targetDate === yesterday) return "Yesterday";
  return `${formatWeekday(target)}, ${formatDateShort(target)}`;
}

export function timeAgo(value: Date | string, now = new Date()): string {
  const diff = now.getTime() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDateShort(value);
}

export function minutesUntil(value: Date | string, now = new Date()): number {
  return Math.round((new Date(value).getTime() - now.getTime()) / 60000);
}

export function minutesBetween(start: Date | string, end: Date | string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}