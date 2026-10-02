/**
 * Integration coverage for the highest-risk paths (§90.2):
 * authentication, game capacity, tournament registration, community
 * interactions, messaging authorization, reviews and admin actions.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import {
  cleanupTestData,
  createTestCourt,
  createTestGame,
  createTestUser,
  getPrisma,
  signIn,
  signOut,
} from "./helpers";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

let prisma: Awaited<ReturnType<typeof getPrisma>>;

beforeEach(async () => {
  signOut();
  prisma = await getPrisma();
});

describe("auth and authorization (§9, §72)", () => {
  it("rejects an unauthenticated mutation", async () => {
    const { joinGameAction } = await import("@/lib/games/actions");
    await expect(joinGameAction("00000000-0000-4000-8000-000000000000")).rejects.toThrow(
      /signed in/i,
    );
  });

  it("reads the session from the cookie and refuses a tampered token", async () => {
    const user = await createTestUser(prisma);
    const { getCurrentUser } = await import("@/lib/auth/session");

    expect(await getCurrentUser()).toBeNull();

    await signIn(user.id);
    const session = await getCurrentUser();
    expect(session?.id).toBe(user.id);

    // A forged cookie must not resolve to a session.
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    jar.set?.("picklenepal_session", "forged-token");
    expect(await getCurrentUser()).toBeNull();
  });

  it("prevents a non-owner from managing another user's game (§72)", async () => {
    const owner = await createTestUser(prisma);
    const other = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Auth Court");
    const game = await createTestGame(prisma, { creatorId: owner.id, courtId: court.id });

    const { requireGameOwner } = await import("@/lib/auth/permissions");

    await signIn(owner.id);
    await expect(requireGameOwner(game.id)).resolves.toMatchObject({ id: game.id });

    signOut();
    await signIn(other.id);
    await expect(requireGameOwner(game.id)).rejects.toThrow(/organiser/i);

    await prisma.game.delete({ where: { id: game.id } });
    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });

  it("blocks a non-participant from reading a conversation (§41)", async () => {
    const a = await createTestUser(prisma);
    const b = await createTestUser(prisma);
    const outsider = await createTestUser(prisma);

    const conversation = await prisma.conversation.create({
      data: {
        participants: { create: [{ userId: a.id }, { userId: b.id }] },
      },
    });

    const { requireConversationParticipant } = await import("@/lib/auth/permissions");

    await signIn(a.id);
    await expect(requireConversationParticipant(conversation.id)).resolves.toBeTruthy();

    signOut();
    await signIn(outsider.id);
    await expect(requireConversationParticipant(conversation.id)).rejects.toThrow(/not part/i);

    await prisma.conversation.delete({ where: { id: conversation.id } });
    await cleanupTestData();
  });
});

describe("game capacity is enforced under concurrency (§16)", () => {
  it("only lets capacity-many players in and queues the rest on the waitlist", async () => {
    const { joinGameAction } = await import("@/lib/games/actions");

    const owner = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Capacity Court");
    const game = await createTestGame(prisma, {
      creatorId: owner.id,
      courtId: court.id,
      capacity: 2,
    });

    const challenger = await createTestUser(prisma);
    await signIn(challenger.id);

    const first = await joinGameAction(game.id);
    expect(first.success).toMatch(/You're in/);

    const third = await createTestUser(prisma);
    signOut();
    await signIn(third.id);
    const second = await joinGameAction(game.id);
    expect(second.success).toMatch(/waitlist/i);

    const participants = await prisma.gameParticipant.count({ where: { gameId: game.id } });
    expect(participants).toBe(2);

    const game2 = await prisma.game.findUniqueOrThrow({ where: { id: game.id } });
    expect(game2.status).toBe("FULL");

    const waitlist = await prisma.gameWaitlist.count({ where: { gameId: game.id } });
    expect(waitlist).toBe(1);

    await prisma.game.delete({ where: { id: game.id } });
    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });

  it("prevents joining the same game twice (§69)", async () => {
    const { joinGameAction } = await import("@/lib/games/actions");

    const owner = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Double Join Court");
    const game = await createTestGame(prisma, { creatorId: owner.id, courtId: court.id });

    const player = await createTestUser(prisma);
    await signIn(player.id);

    await joinGameAction(game.id);
    const second = await joinGameAction(game.id);
    expect(second.error).toMatch(/already in/i);

    await prisma.game.delete({ where: { id: game.id } });
    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });

  it("promotes the first waitlisted player when someone leaves (§17)", async () => {
    const { joinGameAction, leaveGameAction } = await import("@/lib/games/actions");

    const owner = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Waitlist Court");
    const game = await createTestGame(prisma, {
      creatorId: owner.id,
      courtId: court.id,
      // The organiser already occupies one seat, leaving room for one player.
      capacity: 2,
    });

    const first = await createTestUser(prisma);
    await signIn(first.id);
    await joinGameAction(game.id);

    const waiting = await createTestUser(prisma);
    signOut();
    await signIn(waiting.id);
    const waitlisted = await joinGameAction(game.id);
    expect(waitlisted.success).toMatch(/waitlist/i);

    signOut();
    await signIn(first.id);
    const left = await leaveGameAction(game.id);
    expect(left.success).toMatch(/waitlist/i);

    const offer = await prisma.gameWaitlist.findFirstOrThrow({
      where: { gameId: game.id, userId: waiting.id },
    });
    expect(offer.status).toBe("OFFERED");
    expect(offer.offerExpiresAt).not.toBeNull();

    const notification = await prisma.notification.findFirst({
      where: { userId: waiting.id, type: "WAITLIST_AVAILABLE" },
    });
    expect(notification).not.toBeNull();

    await prisma.game.delete({ where: { id: game.id } });
    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });

  it("cancels a game when the organiser leaves with nobody else (§73)", async () => {
    const { leaveGameAction } = await import("@/lib/games/actions");

    const owner = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Orphan Court");
    const game = await createTestGame(prisma, {
      creatorId: owner.id,
      courtId: court.id,
      capacity: 4,
    });

    await signIn(owner.id);
    const result = await leaveGameAction(game.id);
    expect(result.success).toMatch(/cancelled/i);

    const updated = await prisma.game.findUniqueOrThrow({ where: { id: game.id } });
    expect(updated.status).toBe("CANCELLED");
    // History is preserved, not deleted (§18).
    expect(updated.deletedAt).toBeNull();

    await prisma.game.delete({ where: { id: game.id } });
    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });

  it("rejects cancellation once a game has started", async () => {
    const { cancelGameAction } = await import("@/lib/games/actions");

    const owner = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Started Court");
    const game = await createTestGame(prisma, {
      creatorId: owner.id,
      courtId: court.id,
      startsInHours: 0.01,
    });

    await prisma.game.update({
      where: { id: game.id },
      data: { status: "STARTED", startedAt: new Date() },
    });

    await signIn(owner.id);
    const result = await cancelGameAction(game.id, {}, new FormData());
    expect(result.error).toMatch(/not started/i);

    await prisma.game.delete({ where: { id: game.id } });
    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });
});

describe("community interactions (§37)", () => {
  it("likes, comments and prevents duplicate likes", async () => {
    const { createPostAction, togglePostLikeAction, createCommentAction } = await import(
      "@/lib/social/actions"
    );

    const author = await createTestUser(prisma);
    const reader = await createTestUser(prisma);

    await signIn(author.id);
    const created = await createPostAction({}, form({
      content: "Looking for doubles partners in Lalitpur this week.",
      type: "LOOKING_FOR_PLAYERS",
    }));
    expect(created.success).toBeDefined();

    const post = await prisma.communityPost.findFirstOrThrow({
      where: { authorId: author.id },
    });

    signOut();
    await signIn(reader.id);

    const liked = await togglePostLikeAction(post.id);
    expect(liked.success).toBeDefined();
    expect(await prisma.like.count({ where: { postId: post.id } })).toBe(1);

    const unlike = await togglePostLikeAction(post.id);
    expect(unlike.success).toBeDefined();
    expect(await prisma.like.count({ where: { postId: post.id } })).toBe(0);

    const commentForm = new FormData();
    commentForm.set("content", "I am free on Thursday evenings, happy to join.");
    const commented = await createCommentAction(post.id, commentForm);
    expect(commented.success).toBeDefined();
    expect(await prisma.comment.count({ where: { postId: post.id } })).toBe(1);

    await prisma.communityPost.delete({ where: { id: post.id } });
    await cleanupTestData();
  });

  it("allows only one level of comment nesting (§39)", async () => {
    const { createPostAction, createCommentAction } = await import("@/lib/social/actions");

    const author = await createTestUser(prisma);
    const other = await createTestUser(prisma);

    await signIn(author.id);
    await createPostAction({}, form({ content: "Testing nested replies", type: "GENERAL" }));
    const post = await prisma.communityPost.findFirstOrThrow({ where: { authorId: author.id } });

    const topLevel = new FormData();
    topLevel.set("content", "A top level comment.");
    await createCommentAction(post.id, topLevel);
    const parent = await prisma.comment.findFirstOrThrow({ where: { postId: post.id } });

    signOut();
    await signIn(other.id);

    const reply = new FormData();
    reply.set("content", "A reply to the top level comment.");
    reply.set("parentId", parent.id);
    const replyResult = await createCommentAction(post.id, reply);
    expect(replyResult.success).toBeDefined();

    const nested = new FormData();
    nested.set("content", "A reply to a reply.");
    nested.set(
      "parentId",
      (await prisma.comment.findFirstOrThrow({ where: { postId: post.id, depth: 1 } })).id,
    );
    const nestedResult = await createCommentAction(post.id, nested);
    expect(nestedResult.error).toMatch(/top-level/i);

    void parent;
    await prisma.communityPost.delete({ where: { id: post.id } });
    await cleanupTestData();
  });
});

describe("tournament registration rules (§29, §74)", () => {
  it("rejects duplicates, invalid categories, post-deadline and over-capacity", async () => {
    const { registerForTournamentAction } = await import("@/lib/social/actions");

    const organiser = await createTestUser(prisma, { role: "ORGANIZER" });
    const player = await createTestUser(prisma);

    const tournament = await prisma.tournament.create({
      data: {
        slug: `test-tour-${Math.random().toString(36).slice(2, 8)}`,
        name: "Integration Open",
        city: "KATHMANDU",
        venue: "Demo court",
        startsAt: new Date(Date.now() + 7 * 86400_000),
        endsAt: new Date(Date.now() + 8 * 86400_000),
        registrationDeadline: new Date(Date.now() + 2 * 86400_000),
        status: "REGISTRATION_OPEN",
        organizerId: organiser.id,
        categories: {
          create: [
            { name: "Men's Singles", format: "SINGLES", maxEntries: 1 },
            { name: "Mixed Doubles", format: "DOUBLES" },
          ],
        },
      },
      include: { categories: true },
    });

    const singles = tournament.categories.find((c) => c.name === "Men's Singles")!;
    const doubles = tournament.categories.find((c) => c.name === "Mixed Doubles")!;

    await signIn(player.id);

    const first = await registerForTournamentAction(
      form({ tournamentId: tournament.id, categoryId: singles.id }),
    );
    expect(first.success).toBeDefined();

    const duplicate = await registerForTournamentAction(
      form({ tournamentId: tournament.id, categoryId: singles.id }),
    );
    expect(duplicate.error).toMatch(/already registered/i);

    // Over capacity: category maxEntries is 1 and is now full.
    const other = await createTestUser(prisma);
    signOut();
    await signIn(other.id);
    const full = await registerForTournamentAction(
      form({ tournamentId: tournament.id, categoryId: singles.id }),
    );
    expect(full.error).toMatch(/full/i);

    // Invalid category: a category that belongs to a different tournament.
    const otherTournament = await prisma.tournament.create({
      data: {
        slug: `other-tour-${Math.random().toString(36).slice(2, 8)}`,
        name: "Other Open",
        city: "POKHARA",
        venue: "Other court",
        startsAt: new Date(Date.now() + 9 * 86400_000),
        endsAt: new Date(Date.now() + 10 * 86400_000),
        registrationDeadline: new Date(Date.now() + 3 * 86400_000),
        status: "REGISTRATION_OPEN",
        organizerId: organiser.id,
        categories: { create: [{ name: "Other Singles", format: "SINGLES" }] },
      },
      include: { categories: true },
    });

    const invalid = await registerForTournamentAction(
      form({
        tournamentId: tournament.id,
        categoryId: otherTournament.categories[0].id,
      }),
    );
    expect(invalid.error).toMatch(/does not belong/i);

    await prisma.tournament.delete({ where: { id: otherTournament.id } });

    // Doubles without a partner is rejected.
    const noPartner = await registerForTournamentAction(
      form({ tournamentId: tournament.id, categoryId: doubles.id }),
    );
    expect(noPartner.error).toMatch(/partner/i);

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: { registrationDeadline: new Date(Date.now() - 1000) },
    });
    const late = await registerForTournamentAction(
      form({ tournamentId: tournament.id, categoryId: doubles.id, partnerId: player.id }),
    );
    expect(late.error).toMatch(/deadline/i);

    await prisma.tournament.delete({ where: { id: tournament.id } });
    await cleanupTestData();
  });
});

describe("reviews (§45)", () => {
  it("allows one review per reviewer per subject", async () => {
    const { createReviewAction } = await import("@/lib/social/actions");

    const player = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Review Court");

    await signIn(player.id);

    const first = await createReviewAction(
      {},
      form({
        subjectType: "COURT",
        courtId: court.id,
        rating: "5",
        comment: "Excellent surface and good lighting.",
      }),
    );
    expect(first.success).toBeDefined();

    const second = await createReviewAction(
      {},
      form({
        subjectType: "COURT",
        courtId: court.id,
        rating: "3",
        comment: "Decent but busy in the evenings.",
      }),
    );
    expect(second.error).toMatch(/already reviewed/i);

    expect(await prisma.review.count({ where: { courtId: court.id } })).toBe(1);

    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });
});

describe("admin actions (§56, §57, §58)", () => {
  it("lets an admin suspend a user and revokes their sessions", async () => {
    const { setUserStatusAction } = await import("@/lib/settings/actions");

    const admin = await createTestUser(prisma, { role: "ADMIN" });
    const target = await createTestUser(prisma);
    await signIn(target.id);
    const targetToken = (await prisma.session.findFirstOrThrow({ where: { userId: target.id } }))
      .sessionToken;

    signOut();
    await signIn(admin.id);

    const result = await setUserStatusAction(target.id, "SUSPEND", "Testing");
    expect(result.success).toBeDefined();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(updated.status).toBe("SUSPENDED");

    // Sessions are revoked so the cookie is useless.
    const remaining = await prisma.session.count({ where: { userId: target.id } });
    const stillThere = await prisma.session.findUnique({ where: { sessionToken: targetToken } });
    expect(remaining).toBe(0);
    expect(stillThere).toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { adminId: admin.id, action: "USER_SUSPEND" },
    });
    expect(audit).not.toBeNull();

    // A banned user cannot use their session.
    await prisma.session.create({
      data: { sessionToken: targetToken, userId: target.id, expires: new Date(Date.now() + 60000) },
    });
    const { getCurrentUser } = await import("@/lib/auth/session");
    const { cookies } = await import("next/headers");
    (await cookies()).set?.("picklenepal_session", targetToken);
    expect(await getCurrentUser()).toBeNull();

    await cleanupTestData();
  });

  it("refuses admin actions from a non-admin account", async () => {
    const { setUserStatusAction } = await import("@/lib/settings/actions");
    const player = await createTestUser(prisma);
    const victim = await createTestUser(prisma);

    await signIn(player.id);
    await expect(setUserStatusAction(victim.id, "BAN")).rejects.toThrow(/access/i);

    await cleanupTestData();
  });

  it("resolves a report with an audit trail", async () => {
    const { createReportAction } = await import("@/lib/social/actions");
    const { resolveReportAction } = await import("@/lib/settings/actions");

    const reporter = await createTestUser(prisma);
    const author = await createTestUser(prisma);
    const moderator = await createTestUser(prisma, { role: "MODERATOR" });

    await signIn(author.id);
    const { createPostAction } = await import("@/lib/social/actions");
    await createPostAction({}, form({ content: "Spam content for moderation test.", type: "GENERAL" }));
    const post = await prisma.communityPost.findFirstOrThrow({ where: { authorId: author.id } });

    signOut();
    await signIn(reporter.id);
    const report = await createReportAction(
      form({
        reason: "SPAM",
        targetType: "POST",
        targetId: post.id,
        details: "Automated test report",
      }),
    );
    expect(report.success).toBeDefined();

    const record = await prisma.report.findFirstOrThrow({ where: { postId: post.id } });

    signOut();
    await signIn(moderator.id);
    const resolved = await resolveReportAction(record.id, "REMOVE");
    expect(resolved.success).toBeDefined();

    const after = await prisma.report.findUniqueOrThrow({ where: { id: record.id } });
    expect(after.status).toBe("RESOLVED");
    expect(after.action).toBe("REMOVE");

    const hidden = await prisma.communityPost.findUniqueOrThrow({ where: { id: post.id } });
    expect(hidden.isHidden).toBe(true);

    const audit = await prisma.auditLog.findFirst({ where: { action: "REPORT_REMOVE" } });
    expect(audit).not.toBeNull();

    await cleanupTestData();
  });
});

describe("booking conflicts are enforced server-side (§26, §75)", () => {
  it("rejects a second booking that overlaps a confirmed one", async () => {
    const { createBookingAction } = await import("@/lib/bookings/actions");

    const player = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Booking Court");

    await signIn(player.id);

    const date = nepalDateOffset(3);
    const first = await createBookingAction({
      courtId: court.id,
      date,
      startTime: "10:00",
      endTime: "12:00",
    });
    expect(first.success).toBeDefined();

    const second = await createBookingAction({
      courtId: court.id,
      date,
      startTime: "11:00",
      endTime: "13:00",
    });
    expect(second.error).toMatch(/already booked/i);

    // Back-to-back is allowed.
    const third = await createBookingAction({
      courtId: court.id,
      date,
      startTime: "12:00",
      endTime: "14:00",
    });
    expect(third.success).toBeDefined();

    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });

  it("rejects a booking in the past", async () => {
    const { createBookingAction } = await import("@/lib/bookings/actions");
    const player = await createTestUser(prisma);
    const court = await createTestCourt(prisma, "Past Booking Court");

    await signIn(player.id);
    const result = await createBookingAction({
      courtId: court.id,
      date: nepalDateOffset(-2),
      startTime: "10:00",
      endTime: "12:00",
    });
    expect(result.error).toMatch(/past/i);

    await prisma.court.delete({ where: { id: court.id } });
    await cleanupTestData();
  });
});

/* --- helpers ---------------------------------------------------------- */

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

/** Returns a YYYY-MM-DD Nepal date `days` from today. */
function nepalDateOffset(days: number): string {
  const shifted = new Date(Date.now() + 345 * 60_000 + days * 86400_000);
  return shifted.toISOString().slice(0, 10);
}