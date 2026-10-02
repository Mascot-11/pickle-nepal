import { describe, expect, it } from "vitest";
import {
  addDaysToNepalDate,
  endOfNepalDay,
  fromNepalParts,
  startOfNepalDay,
  toNepalParts,
} from "@/lib/dates";
import { formatNPR, normalizeNepalPhone } from "@/lib/nepal";

describe("Nepal timezone handling (§5.4)", () => {
  it("converts Nepal wall-clock time to a UTC instant (UTC+05:45)", () => {
    // 18:00 in Kathmandu is 12:15 UTC.
    const utc = fromNepalParts("2030-06-01", "18:00");
    expect(utc.toISOString()).toBe("2030-06-01T12:15:00.000Z");
  });

  it("round-trips Nepal parts", () => {
    const instant = fromNepalParts("2030-06-01", "07:30");
    const parts = toNepalParts(instant);
    expect(parts.date).toBe("2030-06-01");
    expect(parts.time).toBe("07:30");
  });

  it("handles Nepal midnight correctly relative to UTC", () => {
    const midnight = fromNepalParts("2030-06-01", "00:00");
    expect(midnight.toISOString()).toBe("2030-05-31T18:15:00.000Z");
    expect(toNepalParts(midnight).date).toBe("2030-06-01");
  });

  it("derives day boundaries in Nepal time", () => {
    const instant = new Date("2030-06-01T04:00:00Z"); // 09:45 Nepal
    expect(toNepalParts(startOfNepalDay(instant)).time).toBe("00:00");
    expect(toNepalParts(endOfNepalDay(instant)).time).toBe("23:59");
  });

  it("adds days across month boundaries", () => {
    expect(addDaysToNepalDate("2030-01-31", 1)).toBe("2030-02-01");
    expect(addDaysToNepalDate("2030-12-31", 1)).toBe("2031-01-01");
  });
});

describe("NPR formatting (§5.3)", () => {
  it("formats integers with grouping and a zero value as free", () => {
    expect(formatNPR(500)).toBe("NPR 500");
    expect(formatNPR(1500)).toBe("NPR 1,500");
    expect(formatNPR(10000)).toBe("NPR 10,000");
    expect(formatNPR(0)).toBe("Free");
    expect(formatNPR(null)).toBe("Free");
  });
});

describe("Nepali phone normalisation (§5.2)", () => {
  it("accepts the common formats and strips the country code", () => {
    expect(normalizeNepalPhone("9801234567")).toBe("9801234567");
    expect(normalizeNepalPhone("+9779801234567")).toBe("9801234567");
    expect(normalizeNepalPhone("9779801234567")).toBe("9801234567");
    expect(normalizeNepalPhone("09801234567")).toBe("9801234567");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeNepalPhone("12345")).toBeNull();
    expect(normalizeNepalPhone("")).toBeNull();
  });
});
