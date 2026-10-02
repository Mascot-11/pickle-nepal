"use server";

/**
 * Game server actions (REQUIREMENT.md §13–§20, §73).
 *
 * Authoritative rules live here: capacity is enforced inside a serialisable
 * transaction, waitlist promotion is transactional, and cancellation never
 * deletes history.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  requireGameOwner,
  requireUser,
  isStaff,
} from "@/lib/auth/permissions";
import { gameCreateSchema, gameUpdateSchema as gamePatchSchema } from "@/lib/validation";
import { fromNepalParts } from "@/lib/dates";
import { rateLimit } from "@/lib/rate-limit";
import { NotificationService } from "@/lib/notifications/service";
import { track } from "@/lib/analytics";
import { recomputePlayerStats } from "@/lib/stats";
import { evaluateBadges } from "@/lib/badges";
import {
  canReduceCapacity,
  nextWaitlistCandidate,
  resolveCreatorDeparture,
  waitlistOfferDeadline,
} from "@/lib/games/rules";

export type GameActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
};

function firstError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): GameActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: Object.values(fieldErrors)[0]?.[0] ?? "Please check the form.", fieldErrors };
}


export async function createGameAction(
  _prev: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const user = await requireUser();

  const limited = await rateLimit("game", user.id);
  if (!limited.ok) return { error: "You are creating games too quickly. Try again later." };

  const capacityRaw = formData.get("capacity");
  const parsed = gameCreateSchema.safeParse({
    title: formData.get("title") || undefined,
    courtId: formData.get("courtId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    type: formData.get("type"),
    format: formData.get("format"),
    skillLevel: formData.get("skillLevel") || undefined,
    skillOpenToAll: formData.get("skillOpenToAll") === "on",
    capacity: capacityRaw ?? undefined,
    pricePerPerson: formData.get("pricePerPerson")
      ? Number(formData.get("pricePerPerson"))
      : null,
    description: formData.get("description") || undefined,
    ballInfo: formData.get("ballInfo") || undefined,
    equipmentInfo: formData.get("equipmentInfo") || undefined,
    organizerNote: formData.get("organizerNote") || undefined,
    waitlistEnabled: formData.get("waitlistEnabled") !== "off",
    publish: formData.get("publish") !== "off",
  });

  if (!parsed.success) return firstError(parsed.error);
  const input = parsed.data;

  const court = await prisma.court.findFirst({
    where: { id: input.courtId, isActive: true, deletedAt: null },
    select: { id: true, city: true, name: true },
  });
  if (!court) {
    return { fieldErrors: { courtId: ["That court is no longer available"] }, error: "Choose a different court." };
  }

  const startsAt = fromNepalParts(input.date, input.startTime);
  const endsAt = fromNepalParts(input.date, input.endTime);

  if (endsAt <= startsAt) {
    return { fieldErrors: { endTime: ["End time must be after start time"] }, error: "End time must be after start time." };
  }
  if (startsAt <= new Date()) {
    return { fieldErrors: { date: ["Choose a future date"] }, error: "You cannot create a game in the past." };
  }

  const game = await prisma.game.create({
    data: {
      title: input.title ?? null,
      description: input.description ?? null,
      type: input.type,
      format: input.format,
      skillLevel: input.skillLevel ?? "COMPLETE_BEGINNER",
      skillOpenToAll: input.skillOpenToAll,
      startsAt,
      endsAt,
      capacity: input.capacity,
      status: input.publish ? "OPEN" : "DRAFT",
      city: court.city,
      pricePerPerson: input.pricePerPerson ?? null,
      isFree: !input.pricePerPerson,
      ballInfo: input.ballInfo ?? null,
      equipmentInfo: input.equipmentInfo ?? null,
      organizerNote: input.organizerNote ?? null,
      waitlistEnabled: input.waitlistEnabled,
      courtId: court.id,
      clubId: null,
      creatorId: user.id,
      participants: { create: { userId: user.id, role: "CREATOR" } },
    },
    select: { id: true },
  });

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { gamesCreated: { increment: 1 }, gamesJoined: { increment: 1 } },
  });

  await track({ name: "GAME_CREATED", userId: user.id, entityType: "game", entityId: game.id });
  void evaluateBadges(user.id);

  revalidatePath("/games");
  redirect(`/games/${game.id}?created=1`);
}

/**
 * Joining is the hot path for race conditions: two players may claim the last
 * slot simultaneously. The count check and the insert run inside one
 * serialisable transaction, and the unique index on (gameId, userId) is the
 * final backstop against double-join.
 */
export async function joinGameAction(gameId: string): Promise<GameActionState> {
  const user = await requireUser();
  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          capacity: true,
          startsAt: true,
          title: true,
          courtId: true,
          waitlistEnabled: true,
          waitlistReserveMinutes: true,
          city: true,
          creatorId: true,
        },
      });
      if (!game) throw new NotFoundError("That game no longer exists.");
      if (!["OPEN", "FULL"].includes(game.status)) {
        throw new ValidationError("This game is not open for joining.");
      }
      if (game.startsAt <= now) {
        throw new ValidationError("This game has already started.");
      }

      const existing = await tx.gameParticipant.findUnique({
        where: { gameId_userId: { gameId, userId: user.id } },
        select: { id: true },
      });
      if (existing) throw new ValidationError("You are already in this game.");

      const participantCount = await tx.gameParticipant.count({ where: { gameId } });

      if (participantCount < game.capacity) {
        await tx.gameParticipant.create({
          data: { gameId, userId: user.id, role: "PLAYER" },
        });

        const newCount = participantCount + 1;
        if (newCount >= game.capacity && game.status !== "FULL") {
          await tx.game.update({ where: { id: gameId }, data: { status: "FULL" } });
        }

        // Notify the organiser; skip self-notification via actorId.
        await tx.notification.create({
          data: {
            userId: game.creatorId,
            type: "GAME_JOINED",
            category: "GAME",
            title: `${user.fullName} joined your game`,
            body: game.title ?? "A player joined your game",
            data: { gameId },
          },
        });


        return { outcome: "joined" as const, creatorId: game.creatorId, title: game.title };
      }

      // Full → waitlist.
      if (!game.waitlistEnabled) {
        throw new ValidationError("This game is full and the waitlist is closed.");
      }

      const waitlisted = await tx.gameWaitlist.findUnique({
        where: { gameId_userId: { gameId, userId: user.id } },
        select: { id: true },
      });
      if (waitlisted) throw new ValidationError("You are already on the waitlist.");

      const maxPosition = await tx.gameWaitlist.aggregate({
        where: { gameId },
        _max: { position: true },
      });

      await tx.gameWaitlist.create({
        data: {
          gameId,
          userId: user.id,
          position: (maxPosition._max.position ?? 0) + 1,
          status: "WAITING",
        },
      });

      return { outcome: "waitlisted" as const, creatorId: game.creatorId, title: game.title };
    },
    { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 },
  ).catch((error) => {
    // Business-rule violations are surfaced as a form state so the UI shows a
    // toast instead of an error boundary.
    if (error instanceof ValidationError) {
      return { error: error.message } as const;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2034"
    ) {
      return { error: "Someone else just took the last spot. Try again." } as const;
    }
    throw error;
  });

  if ("error" in result) return result;

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: result.outcome === "joined" ? { gamesJoined: { increment: 1 } } : {},
  });

  await track({ name: "GAME_JOINED", userId: user.id, entityType: "game", entityId: gameId });

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
  return {
    success:
      result.outcome === "joined"
        ? "You're in! See you on court."
        : "You're on the waitlist.",
  };
}

export async function leaveGameAction(gameId: string): Promise<GameActionState> {
  const user = await requireUser();
  const now = new Date();

  const outcome = await prisma.$transaction(
    async (tx) => {
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          startsAt: true,
          capacity: true,
          creatorId: true,
          title: true,
          waitlistReserveMinutes: true,
        },
      });
      if (!game) throw new NotFoundError("That game no longer exists.");
      if (!["OPEN", "FULL", "DRAFT"].includes(game.status)) {
        throw new ValidationError("You cannot leave a game that already started.");
      }
      if (game.startsAt <= now) throw new ValidationError("This game has already started.");

      const participant = await tx.gameParticipant.findUnique({
        where: { gameId_userId: { gameId, userId: user.id } },
        select: { id: true },
      });
      if (!participant) throw new ValidationError("You are not in this game.");

      await tx.gameParticipant.delete({ where: { id: participant.id } });

      let cancelled = false;
      let promotedUserId: string | null = null;

      if (game.creatorId === user.id) {
        const remaining = await tx.gameParticipant.findMany({
          where: { gameId },
          select: { userId: true, joinedAt: true },
          orderBy: { joinedAt: "asc" },
        });

        const decision = resolveCreatorDeparture(
          remaining.map((p) => ({ userId: p.userId, joinedAt: p.joinedAt })),
        );

        if (decision.action === "CANCEL") {
          // Documented rule (§73): nobody left to run it, so cancel and keep history.
          await tx.game.update({
            where: { id: gameId },
            data: { status: "CANCELLED", cancelledAt: now, cancelReason: "Organiser left with no players remaining" },
          });
          cancelled = true;
        } else {
          await tx.gameParticipant.update({
            where: { gameId_userId: { gameId, userId: decision.toUserId } },
            data: { role: "CREATOR" },
          });
          await tx.game.update({ where: { id: gameId }, data: { creatorId: decision.toUserId } });
          await tx.notification.create({
            data: {
              userId: decision.toUserId,
              type: "GAME_UPDATED",
              category: "GAME",
              title: "You are now organising this game",
              body: game.title ?? "The organiser left and handed the game to you",
              data: { gameId },
            },
          });
        }
      }

      // Promote the next waitlisted player if there is now space.
      const remainingCount = await tx.gameParticipant.count({ where: { gameId } });

      if (!cancelled && remainingCount < game.capacity) {
        const entries = await tx.gameWaitlist.findMany({
          where: { gameId },
          orderBy: { position: "asc" },
        });
        const candidate = nextWaitlistCandidate(
          entries.map((e) => ({ userId: e.userId, position: e.position, status: e.status, joinedAt: e.joinedAt })),
          [game.creatorId],
        );

        if (candidate) {
          const deadline = waitlistOfferDeadline(now, game.waitlistReserveMinutes);
          await tx.gameWaitlist.update({
            where: { gameId_userId: { gameId, userId: candidate.userId } },
            data: { status: "OFFERED", offeredAt: now, offerExpiresAt: deadline },
          });
          promotedUserId = candidate.userId;
          await tx.notification.create({
            data: {
              userId: candidate.userId,
              type: "WAITLIST_AVAILABLE",
              category: "GAME",
              title: "A spot opened up",
              body: `You have ${Math.round((deadline.getTime() - now.getTime()) / 60000)} minutes to claim your spot in ${game.title ?? "a game"}.`,
              data: { gameId },
            },
          });
        }
      }

      if (!cancelled) {
        const newStatus = (await tx.gameParticipant.count({ where: { gameId } })) >= game.capacity ? "FULL" : "OPEN";
        await tx.game.update({ where: { id: gameId }, data: { status: newStatus } });
      }

      // Let the organiser know.
      if (game.creatorId !== user.id && !cancelled) {
        await tx.notification.create({
          data: {
            userId: game.creatorId,
            type: "GAME_LEFT",
            category: "GAME",
            title: `${user.fullName} left your game`,
            body: game.title ?? "A player left your game",
            data: { gameId },
          },
        });
      }

      return { cancelled, promotedUserId, creatorId: game.creatorId };
    },
    { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 },
  ).catch((error) => {
    if (error instanceof ValidationError) {
      return { error: error.message } as const;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2034"
    ) {
      return { error: "Someone else just claimed that spot. Refresh and try again." } as const;
    }
    throw error;
  });

  if ("error" in outcome) return outcome;

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { gamesJoined: { decrement: 1 } },
  });

  await track({ name: "GAME_LEFT", userId: user.id, entityType: "game", entityId: gameId });

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");

  if (outcome.cancelled) {
    return { success: "You left and the game was cancelled because nobody else remained." };
  }
  if (outcome.promotedUserId) {
    return { success: "You left the game. The next player on the waitlist has been offered your spot." };
  }
  return { success: "You left the game." };
}

/** Claims a waitlist offer by joining the game (§17). */
export async function acceptWaitlistOfferAction(gameId: string): Promise<GameActionState> {
  const user = await requireUser();

  const entry = await prisma.gameWaitlist.findUnique({
    where: { gameId_userId: { gameId, userId: user.id } },
    select: { id: true, status: true, offerExpiresAt: true },
  });
  if (!entry) return { error: "You are not on the waitlist for this game." };
  if (entry.status !== "OFFERED") return { error: "There is no active offer for you." };
  if (entry.offerExpiresAt && entry.offerExpiresAt <= new Date()) {
    return { error: "This offer has expired. We will offer the spot to the next player." };
  }

  return joinGameAction(gameId);
}

export async function leaveWaitlistAction(gameId: string): Promise<GameActionState> {
  const user = await requireUser();
  const deleted = await prisma.gameWaitlist.deleteMany({
    where: { gameId, userId: user.id },
  });
  if (deleted.count === 0) return { error: "You are not on the waitlist for this game." };

  revalidatePath(`/games/${gameId}`);
  return { success: "You left the waitlist." };
}

/** Updates an existing game; only the organiser (or staff) may do this. */
export async function updateGameAction(
  gameId: string,
  _prev: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  await requireGameOwner(gameId);

  const parsed = gamePatchSchema.safeParse({
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    capacity: formData.get("capacity") || undefined,
    pricePerPerson: formData.get("pricePerPerson")
      ? Number(formData.get("pricePerPerson"))
      : undefined,
    ballInfo: formData.get("ballInfo") || undefined,
    equipmentInfo: formData.get("equipmentInfo") || undefined,
    organizerNote: formData.get("organizerNote") || undefined,
    waitlistEnabled: formData.get("waitlistEnabled") ? true : undefined,
  });
  if (!parsed.success) return firstError(parsed.error);
  const input = parsed.data;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { startsAt: true, capacity: true, status: true },
  });
  if (!game) throw new NotFoundError("Game not found.");

  if (game.startsAt <= new Date() || !["DRAFT", "OPEN", "FULL"].includes(game.status)) {
    return { error: "This game has already started and can no longer be edited." };
  }

  if (input.capacity !== undefined && !canReduceCapacity(game.capacity, 0, input.capacity)) {
    const participants = await prisma.gameParticipant.count({ where: { gameId } });
    if (input.capacity < participants) {
      return {
        fieldErrors: { capacity: [`There are already ${participants} players in this game`] },
        error: "You cannot reduce capacity below the number of players already joined.",
      };
    }
  }

  const participantCount = await prisma.gameParticipant.count({ where: { gameId } });
  const newCapacity = input.capacity ?? game.capacity;

  await prisma.game.update({
    where: { id: gameId },
    data: {
      title: input.title ?? undefined,
      description: input.description ?? undefined,
      capacity: input.capacity,
      pricePerPerson: input.pricePerPerson === undefined ? undefined : input.pricePerPerson,
      isFree: input.pricePerPerson === undefined ? undefined : !input.pricePerPerson,
      ballInfo: input.ballInfo ?? undefined,
      equipmentInfo: input.equipmentInfo ?? undefined,
      organizerNote: input.organizerNote ?? undefined,
      waitlistEnabled: input.waitlistEnabled,
      status: participantCount >= newCapacity ? "FULL" : "OPEN",
    },
  });

  if (input.capacity !== undefined || input.title !== undefined) {
    const participants = await prisma.gameParticipant.findMany({
      where: { gameId },
      select: { userId: true },
    });
    await NotificationService.sendMany(
      participants.map((p) => ({
        userId: p.userId,
        type: "GAME_UPDATED",
        category: "GAME",
        title: "Game details changed",
        body: input.title ? `The game is now called "${input.title}"` : "The organiser updated this game",
        data: { gameId },
        actorId: null,
      })),
    );
  }

  revalidatePath(`/games/${gameId}`);
  return { success: "Game updated." };
}

/**
 * Cancels a game. History is preserved (status becomes CANCELLED) and everyone
 * involved is notified (§18, §73).
 */
export async function cancelGameAction(
  gameId: string,
  _prev: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const user = await requireUser();
  const game = await requireGameOwner(gameId);
  const reason = String(formData.get("reason") ?? "").slice(0, 300);

  if (!["DRAFT", "OPEN", "FULL"].includes(game.status)) {
    return { error: "Only a game that has not started can be cancelled." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: gameId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason || null },
    });

    const participants = await tx.gameParticipant.findMany({ where: { gameId }, select: { userId: true } });
    const waitlisted = await tx.gameWaitlist.findMany({ where: { gameId }, select: { userId: true } });
    const affected = new Map<string, "GAME_CANCELLED" | "WAITLIST_AVAILABLE">();

    for (const p of participants) {
      if (p.userId === user.id) continue;
      affected.set(p.userId, "GAME_CANCELLED");
    }
    for (const w of waitlisted) {
      if (w.userId === user.id) continue;
      if (!affected.has(w.userId)) affected.set(w.userId, "WAITLIST_AVAILABLE");
    }

    for (const [userId, type] of affected) {
      await tx.notification.create({
        data: {
          userId,
          type,
          category: "GAME",
          title:
            type === "GAME_CANCELLED" ? "Your game was cancelled" : "The game you waited for was cancelled",
          body: reason ? `Reason: ${reason}` : "The organiser cancelled this game.",
          data: { gameId },
        },
      });
    }
  });

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
  return { success: "Game cancelled. Everyone involved has been notified." };
}

export async function removeParticipantAction(
  gameId: string,
  participantUserId: string,
): Promise<GameActionState> {
  await requireGameOwner(gameId);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { creatorId: true, status: true, startsAt: true },
  });
  if (!game) throw new NotFoundError("Game not found.");
  if (game.startsAt <= new Date()) {
    return { error: "This game has already started." };
  }

  const removed = await prisma.gameParticipant.deleteMany({
    where: { gameId, userId: participantUserId },
  });
  if (removed.count === 0) return { error: "That player is not in this game." };

  const count = await prisma.gameParticipant.count({ where: { gameId } });
  await prisma.game.update({
    where: { id: gameId },
    data: { status: count >= (game.status === "FULL" ? count : count) ? "FULL" : "OPEN" },
  });

  revalidatePath(`/games/${gameId}`);
  return { success: "Player removed from the game." };
}

/** Marks a game as started/completed and records results (§32). */
export async function completeGameAction(gameId: string): Promise<GameActionState> {
  const user = await requireUser();
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, status: true, creatorId: true, startsAt: true, startedAt: true, title: true },
  });
  if (!game) throw new NotFoundError("Game not found.");
  if (game.creatorId !== user.id && !isStaff(user)) {
    throw new AuthorizationError("Only the organiser can record results.");
  }
  if (game.status === "CANCELLED") return { error: "A cancelled game cannot be completed." };

  await prisma.game.update({
    where: { id: gameId },
    data: { status: "COMPLETED", completedAt: new Date(), startedAt: game.startedAt ?? new Date() },
  });

  const participants = await prisma.gameParticipant.findMany({
    where: { gameId },
    select: { userId: true },
  });

  await recomputePlayerStats(user.id);
  await Promise.all(participants.map((p) => evaluateBadges(p.userId)));

  revalidatePath(`/games/${gameId}`);
  return { success: "Game marked as completed." };
}

export async function startGameAction(gameId: string): Promise<GameActionState> {
  const user = await requireUser();
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, status: true, creatorId: true, startsAt: true },
  });
  if (!game) throw new NotFoundError("Game not found.");
  if (game.creatorId !== user.id && !isStaff(user)) {
    throw new AuthorizationError("Only the organiser can start this game.");
  }
  if (game.startsAt > new Date()) {
    return { error: "This game has not started yet." };
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { status: "STARTED", startedAt: new Date() },
  });

  revalidatePath(`/games/${gameId}`);
  return { success: "Game started." };
}

/** Records the final score for one player in a completed game. */
export async function recordResultAction(formData: FormData): Promise<GameActionState> {
  const user = await requireUser();
  const gameId = String(formData.get("gameId"));
  const targetUserId = String(formData.get("playerId"));
  const scoreFor = Number(formData.get("scoreFor"));
  const scoreAgainst = Number(formData.get("scoreAgainst"));
  const playedAtRaw = String(formData.get("playedAt") ?? "");

  if (!gameId || !targetUserId) return { error: "Missing game or player." };
  if (!Number.isFinite(scoreFor) || !Number.isFinite(scoreAgainst) || scoreFor < 0 || scoreAgainst < 0) {
    return { error: "Enter valid scores." };
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, creatorId: true, status: true, participants: { select: { userId: true } } },
  });
  if (!game) throw new NotFoundError("Game not found.");
  if (game.creatorId !== user.id && !isStaff(user)) {
    throw new AuthorizationError("Only the organiser can record results.");
  }
  if (!game.participants.some((p) => p.userId === targetUserId)) {
    return { error: "That player was not part of this game." };
  }

  const playedAt = playedAtRaw ? fromNepalParts(playedAtRaw, "12:00") : new Date();
  const opponent = game.participants.find((p) => p.userId !== targetUserId)?.userId ?? null;

  await prisma.matchResult.upsert({
    where: { id: await matchResultId(gameId, targetUserId) },
    create: {
      gameId,
      playerId: targetUserId,
      opponentId: opponent,
      scoreFor,
      scoreAgainst,
      isWin: scoreFor > scoreAgainst,
      playedAt,
    },
    update: { scoreFor, scoreAgainst, isWin: scoreFor > scoreAgainst, playedAt },
  });

  await recomputePlayerStats(targetUserId);
  await evaluateBadges(targetUserId);

  revalidatePath(`/games/${gameId}`);
  return { success: "Result recorded." };
}

async function matchResultId(gameId: string, playerId: string): Promise<string> {
  const existing = await prisma.matchResult.findFirst({
    where: { gameId, playerId },
    select: { id: true },
  });
  if (existing) return existing.id;
  return crypto.randomUUID();
}
