/**
 * Integration test harness.
 *
 * Server actions depend on `next/headers`, so cookies are stubbed per user.
 * Tests run against the real development database; each test creates uniquely
 * named fixtures and cleans up after itself.
 */

import { vi, beforeEach, afterAll } from "vitest";
import bcrypt from "bcryptjs";

const DEFAULT_DB = process.env.DATABASE_URL;
if (!DEFAULT_DB) {
  throw new Error("DATABASE_URL must be set to run integration tests");
}

// Must be registered before any module imports next/headers.
const cookieJar = new Map<string, string>();
let currentUserId: string | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.get(name) ? { name, value: cookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
  headers: async () => new Headers({ "user-agent": "vitest", "x-forwarded-for": "127.0.0.1" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    const error = new Error(`NEXT_REDIRECT:${path}`);
    (error as Error & { digest: string }).digest = `NEXT_REDIRECT;replace;${path}`;
    throw error;
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

export async function createTestUser(
  prisma: typeof import("@/lib/db").prisma,
  overrides: { fullName?: string; username?: string; role?: string } = {},
) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const username = overrides.username ?? `test_${suffix}`;
  const passwordHash = await bcrypt.hash("PickleNepal123", 10);

  return prisma.user.create({
    data: {
      fullName: overrides.fullName ?? `Test ${username}`,
      username,
      email: `${username}@picklenepal.test`,
      phone: `98${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
      passwordHash,
      city: "KATHMANDU",
      role: (overrides.role ?? "PLAYER") as never,
      emailVerified: new Date(),
      isOnboarded: true,
      profile: { create: { skillLevel: "INTERMEDIATE", visibility: "PUBLIC", onboardingStep: 6 } },
      notificationPreference: { create: {} },
    },
  });
}

/** Signs a user in by writing a session row and setting the cookie. */
export async function signIn(userId: string) {
  const { prisma } = await import("@/lib/db");
  const token = `test-session-${crypto.randomUUID()}`;
  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expires: new Date(Date.now() + 3600_000),
    },
  });
  cookieJar.set("picklenepal_session", token);
  currentUserId = userId;
  return token;
}

export function signOut() {
  cookieJar.clear();
  currentUserId = null;
}

export function currentTestUserId() {
  return currentUserId;
}

/** Users/usernames created by the current test file, removed afterwards. */
const createdUsernames: string[] = [];

export function trackCreatedUser(username: string) {
  createdUsernames.push(username);
}

export async function cleanupTestData() {
  if (createdUsernames.length === 0) return;
  const { prisma } = await import("@/lib/db");
  const usernames = [...createdUsernames];
  createdUsernames.length = 0;

  await prisma.session.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.notification.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.notificationPreference.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.like.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.comment.deleteMany({ where: { author: { username: { in: usernames } } } });
  await prisma.communityPost.deleteMany({ where: { author: { username: { in: usernames } } } });
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { follower: { username: { in: usernames } } },
        { following: { username: { in: usernames } } },
      ],
    },
  });
  await prisma.gameWaitlist.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.gameParticipant.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.game.deleteMany({ where: { creator: { username: { in: usernames } } } });
  await prisma.matchResult.deleteMany({ where: { player: { username: { in: usernames } } } });
  await prisma.eventParticipant.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.tournamentParticipant.deleteMany({
    where: { user: { username: { in: usernames } } },
  });
  await prisma.conversationParticipant.deleteMany({
    where: { user: { username: { in: usernames } } },
  });
  await prisma.message.deleteMany({ where: { sender: { username: { in: usernames } } } });
  await prisma.userBadge.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.review.deleteMany({ where: { reviewer: { username: { in: usernames } } } });
  await prisma.marketplaceListing.deleteMany({
    where: { seller: { username: { in: usernames } } },
  });
  await prisma.report.deleteMany({ where: { reporter: { username: { in: usernames } } } });
  await prisma.playerProfile.deleteMany({ where: { user: { username: { in: usernames } } } });
  await prisma.user.deleteMany({ where: { username: { in: usernames } } });
}

export async function getPrisma() {
  const { prisma } = await import("@/lib/db");
  return prisma;
}

/** Creates a court plus full opening hours for booking tests. */
export async function createTestCourt(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  name: string,
) {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
  const court = await prisma.court.create({
    data: {
      slug,
      name,
      city: "KATHMANDU",
      indoorOutdoor: "INDOOR",
      amenities: ["Washroom"],
      pricePerHour: 1000,
      isActive: true,
      availability: {
        create: Array.from({ length: 7 }).map((_, dayOfWeek) => ({
          dayOfWeek,
          opensAt: "06:00",
          closesAt: "22:00",
          isClosed: false,
        })),
      },
    },
    include: { availability: true },
  });
  return court;
}

export async function createTestGame(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  params: { creatorId: string; courtId: string; capacity?: number; startsInHours?: number },
) {
  const startsAt = new Date(Date.now() + (params.startsInHours ?? 48) * 3600_000);
  return prisma.game.create({
    data: {
      title: "Integration test game",
      type: "DOUBLES",
      format: "DOUBLES",
      skillLevel: "INTERMEDIATE",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * 3600_000),
      capacity: params.capacity ?? 4,
      status: "OPEN",
      city: "KATHMANDU",
      courtId: params.courtId,
      creatorId: params.creatorId,
      // The creator counts towards capacity, as they do in the real flow.
      participants: { create: { userId: params.creatorId, role: "CREATOR" } },
    },
  });
}

beforeEach(() => {
  cookieJar.clear();
  currentUserId = null;
});

afterAll(async () => {
  await cleanupTestData();
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
});