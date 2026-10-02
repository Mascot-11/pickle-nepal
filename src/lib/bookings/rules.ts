/**
 * Booking conflict + court availability rules (REQUIREMENT.md §26, §75).
 * Pure functions so they can be unit-tested without a database.
 */

export type TimeRange = { startsAt: Date; endsAt: Date };

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  // Half-open intervals: [start, end) — a booking ending at 10:00 does not
  // conflict with one starting at 10:00.
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}

export function findConflict(
  requested: TimeRange,
  existing: Array<TimeRange & { id: string; status: string }>,
): { id: string; status: string } | null {
  const blocking = existing.find(
    (e) => ["PENDING", "CONFIRMED", "COMPLETED"].includes(e.status) && overlaps(requested, e),
  );
  return blocking ?? null;
}

export type OpeningHours = {
  dayOfWeek: number; // 0 = Sunday
  opensAt: string; // "06:00"
  closesAt: string; // "22:00"
  isClosed: boolean;
};

export function isWithinOpeningHours(
  openingHours: OpeningHours[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): boolean {
  const rule = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  // No rule published for that day means the court is not bookable online.
  if (!rule) return false;
  if (rule.isClosed) return false;
  return startTime >= rule.opensAt && endTime <= rule.closesAt;
}

export function bookingPrice(pricePerHour: number | null, durationHours: number): number {
  return Math.round((pricePerHour ?? 0) * durationHours);
}

export function durationHours(range: TimeRange): number {
  return (range.endsAt.getTime() - range.startsAt.getTime()) / (60 * 60 * 1000);
}

export type BookingValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export type BookingWindowInput = {
  startsAt: Date;
  endsAt: Date;
  now: Date;
  openingHours: OpeningHours[];
  existing: Array<TimeRange & { id: string; status: string }>;
  durationLimitHours?: number;
  /**
   * Nepal wall-clock day/time the booking was requested for. Opening hours are
   * a local-time concept, so they must be evaluated against these rather than
   * against the UTC instant (§5.4).
   */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export function validateBookingWindow(params: BookingWindowInput): BookingValidationResult {
  const {
    startsAt,
    endsAt,
    now,
    openingHours,
    existing,
    durationLimitHours = 4,
    dayOfWeek,
    startTime,
    endTime,
  } = params;

  if (startsAt.getTime() <= now.getTime()) {
    return { ok: false, code: "PAST", message: "You cannot book a time in the past." };
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, code: "INVALID_RANGE", message: "End time must be after start time." };
  }
  if (durationHours({ startsAt, endsAt }) > durationLimitHours) {
    return {
      ok: false,
      code: "TOO_LONG",
      message: `Bookings are limited to ${durationLimitHours} hours.`,
    };
  }

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  if (!isWithinOpeningHours(openingHours, dayOfWeek, startTime, endTime)) {
    return {
      ok: false,
      code: "OUTSIDE_HOURS",
      message: "That time falls outside the court's opening hours.",
    };
  }

  if (toMinutes(startTime) >= toMinutes(endTime)) {
    return { ok: false, code: "CROSSES_MIDNIGHT", message: "Bookings must finish the same day." };
  }

  const conflict = findConflict({ startsAt, endsAt }, existing);
  if (conflict) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "That court is already booked for part of that time.",
    };
  }

  return { ok: true };
}