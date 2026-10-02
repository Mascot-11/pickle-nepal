import { describe, expect, it } from "vitest";
import {
  emailSchema,
  nepalPhoneSchema,
  passwordSchema,
  registerSchema,
  bookingCreateSchema,
  gameCreateSchema,
  postCreateSchema,
  reviewCreateSchema,
  tournamentCreateSchema,
  usernameSchema,
} from "@/lib/validation";

describe("credential validation (§9.4)", () => {
  it("accepts strong passwords only", () => {
    expect(passwordSchema.safeParse("PickleNepal123").success).toBe(true);
    expect(passwordSchema.safeParse("short1A").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase123").success).toBe(false);
    expect(passwordSchema.safeParse("NoDigitsHereAtAll").success).toBe(false);
  });

  it("normalises emails and rejects malformed ones", () => {
    expect(emailSchema.parse("  PLAYER@Example.COM ")).toBe("player@example.com");
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("normalises Nepali phone numbers (§5.2)", () => {
    expect(nepalPhoneSchema.parse("+977 9801234567")).toBe("9801234567");
    expect(nepalPhoneSchema.safeParse("12345").success).toBe(false);
  });

  it("enforces username rules", () => {
    expect(usernameSchema.parse("Aayush_01")).toBe("aayush_01");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("bad name!").success).toBe(false);
  });
});

describe("registration", () => {
  const valid = {
    fullName: "Aayush Karki",
    email: "aayush@example.com",
    phone: "9801234567",
    password: "PickleNepal123",
    city: "KATHMANDU" as const,
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a city", () => {
    expect(registerSchema.safeParse({ ...valid, city: undefined }).success).toBe(false);
  });

  it("rejects an unknown city", () => {
    expect(registerSchema.safeParse({ ...valid, city: "MARS" }).success).toBe(false);
  });
});

describe("game creation (§14)", () => {
  const valid = {
    courtId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    date: "2030-06-01",
    startTime: "17:00",
    endTime: "19:00",
    type: "DOUBLES" as const,
    format: "DOUBLES" as const,
    capacity: 4,
    skillOpenToAll: false,
    waitlistEnabled: true,
    publish: true,
  };

  it("accepts a valid game", () => {
    expect(gameCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an end time at or before the start time", () => {
    const same = gameCreateSchema.safeParse({ ...valid, endTime: "17:00" });
    expect(same.success).toBe(false);
    const reversed = gameCreateSchema.safeParse({ ...valid, startTime: "20:00", endTime: "19:00" });
    expect(reversed.success).toBe(false);
  });

  it("enforces capacity bounds", () => {
    expect(gameCreateSchema.safeParse({ ...valid, capacity: 1 }).success).toBe(false);
    expect(gameCreateSchema.safeParse({ ...valid, capacity: 30 }).success).toBe(false);
  });

  it("requires a valid court id", () => {
    expect(gameCreateSchema.safeParse({ ...valid, courtId: "nope" }).success).toBe(false);
  });
});

describe("booking creation (§26)", () => {
  it("requires the end time to be after the start", () => {
    const result = bookingCreateSchema.safeParse({
      courtId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      date: "2030-06-01",
      startTime: "10:00",
      endTime: "09:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("tournament creation (§28)", () => {
  it("rejects a deadline after the start date", () => {
    const result = tournamentCreateSchema.safeParse({
      name: "Demo Open",
      venue: "Demo court",
      city: "KATHMANDU",
      startDate: "2030-06-01",
      endDate: "2030-06-02",
      registrationDeadline: "2030-06-05",
      entryFee: 1000,
      format: "SINGLE_ELIMINATION",
      categories: [{ name: "Men's Singles", format: "SINGLES" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one category", () => {
    const result = tournamentCreateSchema.safeParse({
      name: "Demo Open",
      venue: "Demo court",
      city: "KATHMANDU",
      startDate: "2030-06-01",
      endDate: "2030-06-02",
      registrationDeadline: "2030-05-30",
      entryFee: 0,
      format: "SINGLE_ELIMINATION",
      categories: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("community and reviews (§36, §45)", () => {
  it("requires non-empty post content", () => {
    expect(postCreateSchema.safeParse({ content: "", type: "GENERAL", images: [] }).success).toBe(false);
    expect(postCreateSchema.safeParse({ content: "hello", type: "GENERAL", images: [] }).success).toBe(true);
  });

  it("bounds review ratings and length", () => {
    const base = { subjectType: "COURT" as const, courtId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" };
    expect(reviewCreateSchema.safeParse({ ...base, rating: 6, comment: "Great court" }).success).toBe(false);
    expect(reviewCreateSchema.safeParse({ ...base, rating: 5, comment: "short" }).success).toBe(false);
    expect(reviewCreateSchema.safeParse({ ...base, rating: 5, comment: "Really good court" }).success).toBe(true);
  });
});
