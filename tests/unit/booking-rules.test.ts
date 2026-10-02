import { describe, expect, it } from "vitest";
import {
  bookingPrice,
  type TimeRange,
  durationHours,
  findConflict,
  isWithinOpeningHours,
  overlaps,
  validateBookingWindow,
  type OpeningHours,
} from "@/lib/bookings/rules";

// 2030-06-01 is a Saturday, which is dayOfWeek 6 in JS.
const SATURDAY = 6;
const WEEKDAY = 1;

const hours: OpeningHours[] = [
  { dayOfWeek: WEEKDAY, opensAt: "06:00", closesAt: "22:00", isClosed: false },
  { dayOfWeek: SATURDAY, opensAt: "07:00", closesAt: "21:00", isClosed: false },
];

const NOW = new Date("2030-06-01T00:00:00Z");

describe("overlap detection (§26)", () => {
  it("treats intervals as half-open so back-to-back bookings are fine", () => {
    const a = { startsAt: new Date("2030-06-01T10:00:00Z"), endsAt: new Date("2030-06-01T12:00:00Z") };
    const b = { startsAt: new Date("2030-06-01T12:00:00Z"), endsAt: new Date("2030-06-01T14:00:00Z") };
    expect(overlaps(a, b)).toBe(false);
  });

  it("detects genuine overlaps", () => {
    const a = { startsAt: new Date("2030-06-01T10:00:00Z"), endsAt: new Date("2030-06-01T12:00:00Z") };
    const b = { startsAt: new Date("2030-06-01T11:00:00Z"), endsAt: new Date("2030-06-01T13:00:00Z") };
    expect(overlaps(a, b)).toBe(true);
  });

  it("ignores cancelled bookings", () => {
    const requested = { startsAt: new Date("2030-06-01T10:00:00Z"), endsAt: new Date("2030-06-01T12:00:00Z") };
    const existing = [{ id: "x", status: "CANCELLED", ...requested }];
    expect(findConflict(requested, existing)).toBeNull();
  });
});

describe("opening hours", () => {
  it("accepts a window inside published hours", () => {
    expect(isWithinOpeningHours(hours, WEEKDAY, "10:00", "12:00")).toBe(true);
    expect(isWithinOpeningHours(hours, SATURDAY, "10:00", "12:00")).toBe(true);
  });

  it("rejects windows outside, crossing midnight, or with no rule", () => {
    expect(isWithinOpeningHours(hours, WEEKDAY, "05:00", "07:00")).toBe(false);
    expect(isWithinOpeningHours(hours, SATURDAY, "21:30", "23:00")).toBe(false);
    expect(isWithinOpeningHours(hours, 3, "10:00", "12:00")).toBe(false);
  });
});

describe("booking window validation (§75)", () => {
  const existing = [
    {
      id: "b1",
      status: "CONFIRMED",
      startsAt: new Date("2030-06-01T10:00:00Z"),
      endsAt: new Date("2030-06-01T12:00:00Z"),
    },
  ];

  const window = (
    start: string,
    end: string,
    localStart = "10:00",
    localEnd = "12:00",
    conflicts: Array<TimeRange & { id: string; status: string }> = [],
  ) => ({
    startsAt: new Date(start),
    endsAt: new Date(end),
    now: NOW,
    openingHours: hours,
    existing: conflicts,
    dayOfWeek: SATURDAY,
    startTime: localStart,
    endTime: localEnd,
  });

  it("rejects past bookings", () => {
    const result = validateBookingWindow(window("2030-05-01T10:00:00Z", "2030-05-01T12:00:00Z"));
    expect(result).toMatchObject({ ok: false, code: "PAST" });
  });

  it("rejects overlapping confirmed bookings", () => {
    const result = validateBookingWindow(
      window("2030-06-01T11:00:00Z", "2030-06-01T13:00:00Z", "11:00", "13:00", existing),
    );
    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
  });

  it("rejects bookings outside opening hours", () => {
    const result = validateBookingWindow(
      window("2030-06-01T01:00:00Z", "2030-06-01T03:00:00Z", "06:30", "08:30"),
    );
    expect(result).toMatchObject({ ok: false, code: "OUTSIDE_HOURS" });
  });

  it("accepts a back-to-back booking that starts when another ends", () => {
    const result = validateBookingWindow(
      window("2030-06-01T12:00:00Z", "2030-06-01T14:00:00Z", "12:00", "14:00", existing),
    );
    expect(result).toEqual({ ok: true });
  });

  it("accepts a valid window", () => {
    const result = validateBookingWindow(
      window("2030-06-01T14:00:00Z", "2030-06-01T16:00:00Z", "14:00", "16:00", existing),
    );
    expect(result).toEqual({ ok: true });
  });

  it("enforces the maximum duration", () => {
    const result = validateBookingWindow({
      ...window("2030-06-01T06:00:00Z", "2030-06-01T14:00:00Z", "08:00", "16:00"),
      durationLimitHours: 4,
    });
    expect(result).toMatchObject({ ok: false, code: "TOO_LONG" });
  });
});

describe("pricing", () => {
  it("prices by duration", () => {
    expect(bookingPrice(1200, 2)).toBe(2400);
    expect(bookingPrice(null, 2)).toBe(0);
    expect(bookingPrice(1000, 1.5)).toBe(1500);
  });

  it("measures duration in hours", () => {
    expect(
      durationHours({
        startsAt: new Date("2030-06-01T10:00:00Z"),
        endsAt: new Date("2030-06-01T12:30:00Z"),
      }),
    ).toBe(2.5);
  });
});
