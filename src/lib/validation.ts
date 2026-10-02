/**
 * Shared Zod validators. Used on the server for authoritative checks (§82) and
 * re-used by client forms so both sides stay in sync (§102.8).
 */

import { z } from "zod";
import { CITIES, normalizeNepalPhone } from "@/lib/nepal";

const cityValues = CITIES.map((c) => c.value) as [string, ...string[]];

export const citySchema = z.enum(cityValues);

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Email is required")
  .max(255)
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

/** Accepts 98XXXXXXXX, +97798XXXXXXXX, 97798XXXXXXXX or 9800000000. */
export const nepalPhoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizeNepalPhone(v);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid Nepali mobile number (98XXXXXXXX)",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

// Lower-cased before the regex runs so "Aayush_01" is accepted and stored as
// "aayush_01" rather than being rejected on case.
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(24)
  .regex(/^[a-z0-9_.]+$/, "Use letters, numbers, dots or underscores only");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: emailSchema,
  phone: nepalPhoneSchema,
  password: passwordSchema,
  city: citySchema,
  username: usernameSchema.optional(),
  dateOfBirth: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date"),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  referralCode: z.string().trim().max(20).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

// --- Onboarding (§10) ------------------------------------------------------

export const onboardingSchema = z.object({
  city: citySchema.optional(),
  skillLevel: z
    .enum([
      "COMPLETE_BEGINNER",
      "BEGINNER",
      "INTERMEDIATE",
      "UPPER_INTERMEDIATE",
      "ADVANCED",
      "COMPETITIVE",
    ])
    .optional(),
  preferredFormats: z.array(z.enum(["SINGLES", "DOUBLES", "BOTH"])).optional(),
  position: z.enum(["LEFT", "RIGHT", "EITHER"]).optional(),
  availability: z
    .array(
      z.enum(["EARLY_MORNING", "MORNING", "AFTERNOON", "EVENING", "NIGHT", "WEEKENDS"]),
    )
    .optional(),
  frequency: z
    .enum(["OCCASIONALLY", "ONE_TO_TWO_WEEKLY", "THREE_TO_FOUR_WEEKLY", "FIVE_PLUS_WEEKLY"])
    .optional(),
  duprRating: z.coerce.number().min(2).max(5.5).optional(),
  bio: z.string().trim().max(600).optional(),
  instagram: z.string().trim().max(80).optional(),
  facebook: z.string().trim().max(200).optional(),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  username: usernameSchema.optional(),
  phone: nepalPhoneSchema.optional(),
  city: citySchema.optional(),
  bio: z.string().trim().max(600).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  skillLevel: z
    .enum([
      "COMPLETE_BEGINNER",
      "BEGINNER",
      "INTERMEDIATE",
      "UPPER_INTERMEDIATE",
      "ADVANCED",
      "COMPETITIVE",
    ])
    .optional(),
  duprRating: z.coerce.number().min(2).max(5.5).nullable().optional(),
  preferredFormats: z.array(z.enum(["SINGLES", "DOUBLES", "BOTH"])).optional(),
  position: z.enum(["LEFT", "RIGHT", "EITHER"]).optional(),
  availability: z
    .array(
      z.enum(["EARLY_MORNING", "MORNING", "AFTERNOON", "EVENING", "NIGHT", "WEEKENDS"]),
    )
    .optional(),
  frequency: z
    .enum(["OCCASIONALLY", "ONE_TO_TWO_WEEKLY", "THREE_TO_FOUR_WEEKLY", "FIVE_PLUS_WEEKLY"])
    .optional(),
  instagram: z.string().trim().max(80).optional(),
  facebook: z.string().trim().max(200).optional(),
  visibility: z.enum(["PUBLIC", "COMMUNITY_ONLY", "PRIVATE"]).optional(),
});

export const privacySettingsSchema = z.object({
  visibility: z.enum(["PUBLIC", "COMMUNITY_ONLY", "PRIVATE"]),
  showDOB: z.boolean(),
});

// --- Games (§14) -----------------------------------------------------------

export const gameCreateSchema = z
  .object({
    title: z.string().trim().max(100).optional(),
    courtId: z.string().uuid("Choose a court"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose an end time"),
    type: z.enum([
      "SINGLES",
      "DOUBLES",
      "OPEN_PLAY",
      "FRIENDLY",
      "COMPETITIVE",
      "DRILL_SESSION",
      "KING_OF_COURT",
    ]),
    format: z.enum(["SINGLES", "DOUBLES", "BOTH"]).default("DOUBLES"),
    skillLevel: z
      .enum([
        "COMPLETE_BEGINNER",
        "BEGINNER",
        "INTERMEDIATE",
        "UPPER_INTERMEDIATE",
        "ADVANCED",
        "COMPETITIVE",
      ])
      .optional(),
    skillOpenToAll: z.boolean().default(false),
    capacity: z.coerce.number().int().min(2).max(24),
    pricePerPerson: z.coerce.number().int().min(0).max(100000).nullable().optional(),
    description: z.string().trim().max(1000).optional(),
    ballInfo: z.string().trim().max(200).optional(),
    equipmentInfo: z.string().trim().max(200).optional(),
    organizerNote: z.string().trim().max(500).optional(),
    waitlistEnabled: z.boolean().default(true),
    publish: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.startTime === value.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
    if (value.startTime > value.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
    if (value.pricePerPerson === null && !value.skillOpenToAll) {
      // A price of 0 is valid and means free; null means unspecified.
    }
  });

export const gameUpdateSchema = z.object({
  title: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  capacity: z.coerce.number().int().min(2).max(24).optional(),
  pricePerPerson: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  ballInfo: z.string().trim().max(200).optional(),
  equipmentInfo: z.string().trim().max(200).optional(),
  organizerNote: z.string().trim().max(500).optional(),
  waitlistEnabled: z.boolean().optional(),
  cancelReason: z.string().trim().max(300).optional(),
});

// --- Community (§36-§39) --------------------------------------------------

export const postCreateSchema = z.object({
  content: z.string().trim().min(1, "Write something first").max(4000),
  type: z
    .enum([
      "GENERAL",
      "LOOKING_FOR_PLAYERS",
      "TOURNAMENT",
      "COURT",
      "GEAR",
      "COACHING",
      "ANNOUNCEMENT",
    ])
    .default("GENERAL"),
  images: z.array(z.string().url()).max(6).default([]),
  linkUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export const commentCreateSchema = z.object({
  content: z.string().trim().min(1, "Write a reply first").max(2000),
  parentId: z.string().uuid().optional(),
});

// --- Events (§27) ----------------------------------------------------------

export const eventCreateSchema = z.object({
  title: z.string().trim().min(3, "Enter a title").max(140),
  description: z.string().trim().max(3000).optional(),
  type: z.enum([
    "OPEN_PLAY",
    "SOCIAL_NIGHT",
    "MEETUP",
    "COACHING_SESSION",
    "DEMO_DAY",
    "TOURNAMENT",
    "COMMUNITY_EVENT",
  ]),
  venue: z.string().trim().min(2, "Enter a venue").max(200),
  city: citySchema,
  courtId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(2).max(1000).nullable().optional(),
  cost: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

// --- Bookings (§26) --------------------------------------------------------

export const bookingCreateSchema = z
  .object({
    courtId: z.string().uuid("Choose a court"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    notes: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startTime >= value.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
  });

// --- Tournaments (§28) -----------------------------------------------------

export const tournamentCreateSchema = z
  .object({
    name: z.string().trim().min(3, "Enter a name").max(140),
    description: z.string().trim().max(5000).optional(),
    rules: z.string().trim().max(5000).optional(),
    venue: z.string().trim().min(2, "Enter a venue").max(200),
    city: citySchema,
    courtId: z.string().uuid().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    registrationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entryFee: z.coerce.number().int().min(0).max(100000).default(0),
    prizeInfo: z.string().trim().max(2000).optional(),
    contactInfo: z.string().trim().max(500).optional(),
    format: z
      .enum(["ROUND_ROBIN", "SINGLE_ELIMINATION", "HYBRID"])
      .default("SINGLE_ELIMINATION"),
    maxParticipants: z.coerce.number().int().min(4).max(512).nullable().optional(),
    posterUrl: z.string().url().optional().or(z.literal("")),
    categories: z
      .array(
        z.object({
          name: z.string().trim().min(2).max(60),
          format: z.enum(["SINGLES", "DOUBLES"]),
          maxEntries: z.coerce.number().int().min(2).max(128).nullable().optional(),
        }),
      )
      .min(1, "Add at least one category"),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    }
    if (value.registrationDeadline > value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["registrationDeadline"],
        message: "Registration must close before the tournament starts",
      });
    }
  });

export const tournamentRegistrationSchema = z.object({
  categoryId: z.string().uuid("Choose a category"),
  partnerId: z.string().uuid().optional(),
  teamName: z.string().trim().max(60).optional(),
});

// --- Reviews (§45), marketplace (§46), messaging (§41) ---------------------

export const reviewCreateSchema = z.object({
  subjectType: z.enum(["COURT", "CLUB", "COACH"]),
  courtId: z.string().uuid().optional(),
  coachId: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  comment: z.string().trim().min(10, "Write at least 10 characters").max(1500),
  facilities: z.coerce.number().int().min(1).max(5).optional(),
  courtQuality: z.coerce.number().int().min(1).max(5).optional(),
  staffRating: z.coerce.number().int().min(1).max(5).optional(),
  valueRating: z.coerce.number().int().min(1).max(5).optional(),
});

export const listingCreateSchema = z.object({
  title: z.string().trim().min(4, "Enter a title").max(120),
  description: z.string().trim().min(10, "Describe the item").max(3000),
  price: z.coerce.number().int().min(1, "Enter a price").max(10000000),
  category: z.enum([
    "PADDLES",
    "BALLS",
    "SHOES",
    "BAGS",
    "CLOTHING",
    "ACCESSORIES",
    "COURT_EQUIPMENT",
  ]),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "USED"]),
  city: citySchema,
  images: z.array(z.string().url()).max(8).default([]),
  isNegotiable: z.boolean().default(false),
});

export const messageSchema = z.object({
  content: z.string().trim().min(1, "Write a message").max(4000),
});

export const reportSchema = z.object({
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "SCAM",
    "FAKE_INFORMATION",
    "INAPPROPRIATE_CONTENT",
    "OTHER",
  ]),
  details: z.string().trim().max(1000).optional(),
  targetType: z.enum([
    "USER",
    "POST",
    "COMMENT",
    "GAME",
    "COURT",
    "CLUB",
    "EVENT",
    "TOURNAMENT",
    "REVIEW",
    "LISTING",
    "MESSAGE",
  ]),
  targetId: z.string().uuid(),
});

export const verificationRequestSchema = z.object({
  type: z.enum(["CLUB", "COACH", "ORGANIZER", "SELLER"]),
  name: z.string().trim().min(2, "Enter your name or business").max(120),
  organization: z.string().trim().max(160).optional(),
  description: z.string().trim().min(20, "Tell us about this").max(2000),
  contactInfo: z.string().trim().max(200).optional(),
  documents: z.array(z.string().url()).max(5).default([]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GameCreateInput = z.infer<typeof gameCreateSchema>;
export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type TournamentCreateInput = z.infer<typeof tournamentCreateSchema>;
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;