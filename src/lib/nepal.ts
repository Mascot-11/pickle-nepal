/**
 * Nepal-aware constants and formatting (REQUIREMENT.md §5).
 *
 * Everything here is configurable via env so it is not hardcoded across the app.
 */

export const TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Kathmandu";
export const CURRENCY = process.env.NEXT_PUBLIC_APP_CURRENCY ?? "NPR";
export const COUNTRY_CODE = process.env.NEXT_PUBLIC_PHONE_COUNTRY_CODE ?? "+977";

export const CITIES = [
  { value: "KATHMANDU", label: "Kathmandu", lat: 27.7172, lng: 85.324 },
  { value: "LALITPUR", label: "Lalitpur", lat: 27.6588, lng: 85.3247 },
  { value: "BHAKTAPUR", label: "Bhaktapur", lat: 27.671, lng: 85.4298 },
  { value: "POKHARA", label: "Pokhara", lat: 28.2096, lng: 83.9856 },
  { value: "CHITWAN", label: "Chitwan", lat: 27.5291, lng: 84.3542 },
  { value: "BIRATNAGAR", label: "Biratnagar", lat: 26.4525, lng: 87.2718 },
  { value: "BUTWAL", label: "Butwal", lat: 27.7006, lng: 83.4482 },
  { value: "DHARAN", label: "Dharan", lat: 26.8065, lng: 87.2846 },
  { value: "OTHER_NEPAL", label: "Other Nepal", lat: 28.3949, lng: 84.124 },
] as const;

export type CityValue = (typeof CITIES)[number]["value"];

export const CITY_LABELS = Object.fromEntries(
  CITIES.map((c) => [c.value, c.label]),
) as Record<string, string>;

export const SKILL_LEVELS = [
  { value: "COMPLETE_BEGINNER", label: "Complete Beginner" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "UPPER_INTERMEDIATE", label: "Upper Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "COMPETITIVE", label: "Competitive" },
] as const;

export const SKILL_LABELS = Object.fromEntries(
  SKILL_LEVELS.map((s) => [s.value, s.label]),
) as Record<string, string>;

export const GAME_TYPES = [
  { value: "SINGLES", label: "Singles", defaultCapacity: 2 },
  { value: "DOUBLES", label: "Doubles", defaultCapacity: 4 },
  { value: "OPEN_PLAY", label: "Open Play", defaultCapacity: 8 },
  { value: "FRIENDLY", label: "Friendly", defaultCapacity: 4 },
  { value: "COMPETITIVE", label: "Competitive", defaultCapacity: 4 },
  { value: "DRILL_SESSION", label: "Drill Session", defaultCapacity: 8 },
  { value: "KING_OF_COURT", label: "King/Queen of the Court", defaultCapacity: 4 },
] as const;

export const GAME_TYPE_LABELS = Object.fromEntries(
  GAME_TYPES.map((g) => [g.value, g.label]),
) as Record<string, string>;

export const AVAILABILITY_SLOTS = [
  { value: "EARLY_MORNING", label: "Early morning" },
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "NIGHT", label: "Night" },
  { value: "WEEKENDS", label: "Weekends" },
] as const;

export const PLAY_FORMATS = [
  { value: "SINGLES", label: "Singles" },
  { value: "DOUBLES", label: "Doubles" },
  { value: "BOTH", label: "Both" },
] as const;

export const POSITIONS = [
  { value: "LEFT", label: "Left" },
  { value: "RIGHT", label: "Right" },
  { value: "EITHER", label: "Either" },
] as const;

export const FREQUENCIES = [
  { value: "OCCASIONALLY", label: "Occasionally" },
  { value: "ONE_TO_TWO_WEEKLY", label: "1–2 times/week" },
  { value: "THREE_TO_FOUR_WEEKLY", label: "3–4 times/week" },
  { value: "FIVE_PLUS_WEEKLY", label: "5+ times/week" },
] as const;

export const AMENITIES = [
  "Parking",
  "Washroom",
  "Changing room",
  "Drinking water",
  "Cafe",
  "Lighting",
  "Spectator area",
  "Equipment rental",
] as const;

export const EVENT_TYPES = [
  { value: "OPEN_PLAY", label: "Open Play" },
  { value: "SOCIAL_NIGHT", label: "Social Night" },
  { value: "MEETUP", label: "Meetup" },
  { value: "COACHING_SESSION", label: "Coaching Session" },
  { value: "DEMO_DAY", label: "Demo Day" },
  { value: "TOURNAMENT", label: "Tournament" },
  { value: "COMMUNITY_EVENT", label: "Community Event" },
] as const;

export const POST_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "LOOKING_FOR_PLAYERS", label: "Looking for Players" },
  { value: "TOURNAMENT", label: "Tournament" },
  { value: "COURT", label: "Court" },
  { value: "GEAR", label: "Gear" },
  { value: "COACHING", label: "Coaching" },
  { value: "ANNOUNCEMENT", label: "Announcement" },
] as const;

export const LISTING_CATEGORIES = [
  { value: "PADDLES", label: "Paddles" },
  { value: "BALLS", label: "Balls" },
  { value: "SHOES", label: "Shoes" },
  { value: "BAGS", label: "Bags" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "COURT_EQUIPMENT", label: "Court equipment" },
] as const;

export const REPORT_REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SCAM", label: "Scam" },
  { value: "FAKE_INFORMATION", label: "Fake information" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "OTHER", label: "Other" },
] as const;

export const FEATURE_FLAGS = [
  "BOOKINGS",
  "PAYMENTS",
  "MARKETPLACE",
  "PREMIUM",
  "MESSAGING",
  "PUSH_NOTIFICATIONS",
  "DUPR_INTEGRATION",
  "SPONSOR_ADS",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number];

/**
 * Formats an integer NPR amount. Nepal uses the lakh/crore grouping but for
 * prices under a lakh the international grouping matches local expectation.
 * Examples: 500 -> "NPR 500", 1500 -> "NPR 1,500" (§5.3).
 */
export function formatNPR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Free";
  if (amount === 0) return "Free";
  return `${CURRENCY} ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || amount === 0) return "Free";
  return formatNPR(amount);
}

/**
 * Strips formatting, +977 and leading zeros so the stored value is a comparable
 * 10-digit mobile number. Accepts 98XXXXXXXX, 098XXXXXXXX, +97798XXXXXXXX and
 * 97798XXXXXXXX.
 */
export function normalizeNepalPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 15) return null; // not a mobile number
  if (digits.startsWith("977")) {
    const rest = digits.slice(3);
    return /^9\d{9}$/.test(rest) ? rest : null;
  }
  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  return /^9\d{9}$/.test(national) ? national : null;
}

export function formatNepalPhone(stored: string): string {
  return `${COUNTRY_CODE} ${stored}`;
}

export function cityLabel(value: string): string {
  return CITY_LABELS[value] ?? value;
}