"use server";

/** Tournament creation and organiser management (§28–§31). */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  requireTournamentOrganizer,
  requireUser,
} from "@/lib/auth/permissions";
import { tournamentCreateSchema } from "@/lib/validation";
import { fromNepalParts } from "@/lib/dates";
import { uniqueSlug } from "@/lib/slug";
import { NotificationService } from "@/lib/notifications/service";
import { recomputePlayerStats } from "@/lib/stats";

export type TournamentState = { error?: string; success?: string; fieldErrors?: Record<string, string[]> };

function firstError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): TournamentState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: Object.values(fieldErrors)[0]?.[0] ?? "Please check the form.", fieldErrors };
}

async function requireOrganizerRole() {
  const user = await requireUser();
  if (!["ORGANIZER", "ADMIN"].includes(user.role)) {
    throw new AuthorizationError("Only organisers can manage tournaments.");
  }
  return user;
}

export async function createTournamentAction(
  _prev: TournamentState,
  formData: FormData,
): Promise<TournamentState> {
  const user = await requireOrganizerRole();

  const rawCategories = formData.getAll("categoryName").map(String).filter(Boolean);
  const categoryFormats = formData.getAll("categoryFormat").map(String);

  const parsed = tournamentCreateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    rules: formData.get("rules") || undefined,
    venue: formData.get("venue"),
    city: formData.get("city"),
    courtId: formData.get("courtId") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    registrationDeadline: formData.get("registrationDeadline"),
    entryFee: formData.get("entryFee") || 0,
    prizeInfo: formData.get("prizeInfo") || undefined,
    contactInfo: formData.get("contactInfo") || undefined,
    format: formData.get("format"),
    maxParticipants: formData.get("maxParticipants") || undefined,
    posterUrl: formData.get("posterUrl") || undefined,
    categories: rawCategories.map((name, index) => ({
      name,
      format: categoryFormats[index] === "DOUBLES" ? "DOUBLES" : "SINGLES",
      maxEntries: null,
    })),
  });
  if (!parsed.success) return firstError(parsed.error);
  const input = parsed.data;

  const slug = await uniqueSlug(input.name, async (candidate) => {
    const existing = await prisma.tournament.findUnique({ where: { slug: candidate }, select: { id: true } });
    return !!existing;
  });

  const startsAt = fromNepalParts(input.startDate, "08:00");
  const endsAt = fromNepalParts(input.endDate, "18:00");
  const deadline = fromNepalParts(input.registrationDeadline, "23:00");

  const tournament = await prisma.tournament.create({
    data: {
      slug,
      name: input.name,
      description: input.description ?? null,
      rules: input.rules ?? null,
      venue: input.venue,
      city: input.city as never,
      startsAt,
      endsAt,
      registrationDeadline: deadline,
      entryFee: input.entryFee,
      prizeInfo: input.prizeInfo ?? null,
      contactInfo: input.contactInfo ?? null,
      format: input.format,
      status: "DRAFT",
      maxParticipants: input.maxParticipants ?? null,
      posterUrl: input.posterUrl || null,
      courtId: input.courtId ?? null,
      organizerId: user.id,
      categories: {
        create: input.categories.map((category) => ({
          name: category.name,
          format: category.format,
          maxEntries: category.maxEntries ?? null,
        })),
      },
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/organizer/dashboard");
  revalidatePath("/tournaments");
  redirect(`/organizer/tournaments/${tournament.id}/manage?created=1`);
}

export async function updateTournamentStatusAction(
  tournamentId: string,
  status: "DRAFT" | "UPCOMING" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "LIVE" | "COMPLETED" | "CANCELLED",
): Promise<TournamentState> {
  const organizer = await requireTournamentOrganizer(tournamentId);

  await prisma.tournament.update({ where: { id: tournamentId }, data: { status } });

  if (["REGISTRATION_OPEN", "LIVE", "COMPLETED"].includes(status)) {
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      select: { userId: true },
    });
    await NotificationService.sendMany(
      participants.map((p) => ({
        userId: p.userId,
        type: "TOURNAMENT_UPDATE" as const,
        category: "TOURNAMENT" as const,
        title: `${organizer.slug ? "Tournament" : "Tournament"} update`,
        body: `The tournament status is now ${status.replace(/_/g, " ").toLowerCase()}.`,
        data: { tournamentId },
      })),
    );
  }

  revalidatePath(`/organizer/tournaments/${tournamentId}/manage`);
  revalidatePath(`/tournaments/${organizer.slug}`);
  return { success: `Status set to ${status.replace(/_/g, " ").toLowerCase()}.` };
}

/**
 * Generates a single-elimination bracket from current participants. Doubles
 * categories use explicit teams (§29); singles use players.
 */
export async function generateBracketAction(tournamentId: string): Promise<TournamentState> {
  await requireTournamentOrganizer(tournamentId);

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      categories: { include: { participants: { select: { userId: true } }, teams: { include: { members: { select: { playerId: true } } } } } },
      matches: { select: { id: true } },
    },
  });
  if (!tournament) throw new NotFoundError("Tournament not found.");
  if (tournament.matches.length > 0) {
    return { error: "A bracket already exists. Remove it before generating a new one." };
  }

  let created = 0;

  for (const category of tournament.categories) {
    const isDoubles = category.format === "DOUBLES";
    const seeds = isDoubles
      ? category.teams.map((team) => ({ teamId: team.id }))
      : category.participants.map((p) => ({ playerId: p.userId }));

    if (seeds.length < 2) continue;

    // Pad to the next power of two with byes.
    const size = 2 ** Math.ceil(Math.log2(seeds.length));
    const padded = [...seeds];
    while (padded.length < size) padded.push({ bye: true } as never);

    const round = Math.log2(size);
    await prisma.tournamentMatch.createMany({
      data: padded.map((seed, index) => ({
        tournamentId,
        categoryId: category.id,
        round: 1,
        position: index + 1,
        playerAId: "playerId" in seed ? (seed.playerId as string) : null,
        teamAId: "teamId" in seed ? (seed.teamId as string) : null,
        status: "SCHEDULED" as const,
        scheduledAt: tournament.startsAt,
      })),
    });
    created += 1;

    // Create later rounds as empty slots so the bracket shows its full shape.
    for (let r = 2; r <= round; r += 1) {
      const count = size / 2 ** r;
      await prisma.tournamentMatch.createMany({
        data: Array.from({ length: count }).map((_, index) => ({
          tournamentId,
          categoryId: category.id,
          round: r,
          position: index + 1,
          status: "SCHEDULED" as const,
        })),
      });
    }
  }

  if (created === 0) {
    return { error: "Not enough participants to build a bracket in any category." };
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { currentRound: 1 },
  });

  revalidatePath(`/organizer/tournaments/${tournamentId}/manage`);
  return { success: `Bracket generated for ${created} ${created === 1 ? "category" : "categories"}.` };
}

/**
 * Enters a score and advances the winner into the next round when the rules
 * allow it (§31, §74).
 */
export async function recordMatchResultAction(
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<TournamentState> {
  const user = await requireUser();

  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      tournamentId: true,
      categoryId: true,
      round: true,
      position: true,
      playerAId: true,
      playerBId: true,
      teamAId: true,
      teamBId: true,
      status: true,
      tournament: { select: { organizerId: true } },
    },
  });
  if (!match) throw new NotFoundError("Match not found.");

  if (match.tournament.organizerId !== user.id && user.role !== "ADMIN") {
    throw new AuthorizationError("Only the organiser can enter results.");
  }
  if (match.status === "COMPLETED") {
    return { error: "This result is already recorded and is immutable for ordinary users." };
  }
  if (!match.playerAId && !match.teamAId) {
    return { error: "This match does not have a competitor on side A yet." };
  }
  if (scoreA === scoreB) {
    return { error: "A match must have a winner." };
  }

  const winnerIsA = scoreA > scoreB;
  const winnerPlayerId = winnerIsA ? match.playerAId : match.playerBId;
  const winnerTeamId = winnerIsA ? match.teamAId : match.teamBId;

  await prisma.$transaction(async (tx) => {
    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: {
        scoreA,
        scoreB,
        winnerId: winnerPlayerId,
        winnerTeamId,
        status: "COMPLETED",
        playedAt: new Date(),
      },
    });

    // Advance: next-round slot is ceil(position / 2).
    const nextPosition = Math.ceil(match.position / 2);
    if (match.round) {
      const nextMatch = await tx.tournamentMatch.findFirst({
        where: {
          tournamentId: match.tournamentId,
          categoryId: match.categoryId,
          round: match.round + 1,
          position: nextPosition,
        },
        select: { id: true, playerAId: true, teamAId: true },
      });

      if (nextMatch) {
        const isSideA = match.position % 2 === 1;
        await tx.tournamentMatch.update({
          where: { id: nextMatch.id },
          data: isSideA
            ? { playerAId: winnerPlayerId, teamAId: winnerTeamId }
            : { playerBId: winnerPlayerId, teamBId: winnerTeamId },
        });
      }
    }
  });

  if (winnerPlayerId) {
    await recomputePlayerStats(winnerPlayerId);
  }

  revalidatePath(`/organizer/tournaments/${match.tournamentId}/manage`);
  return { success: "Result recorded." };
}

export async function removeTournamentAction(tournamentId: string): Promise<TournamentState> {
  await requireTournamentOrganizer(tournamentId);
  const matches = await prisma.tournamentMatch.count({ where: { tournamentId } });
  if (matches > 0) {
    throw new ValidationError("Remove all matches before deleting the bracket.");
  }
  await prisma.tournament.delete({ where: { id: tournamentId } });
  revalidatePath("/organizer/dashboard");
  redirect("/organizer/dashboard");
}