/**
 * Statistics, rankings and community points (REQUIREMENT.md §32–§34).
 *
 * IMPORTANT: nothing here is DUPR. Internal results are labelled
 * "PickleNepal Community Ranking" everywhere they are rendered (§62).
 */

import "server-only";
import { prisma } from "@/lib/db";
import { toNepalParts } from "@/lib/dates";
import { SKILL_LEVELS } from "@/lib/nepal";

export const RANKING_LABEL = "PickleNepal Community Ranking";
export const RANKING_METHODOLOGY =
  "Points are earned for completed games, wins and tournament results on PickleNepal. " +
  "This is an internal community ranking and is not an official DUPR rating.";

/** Recomputes cached counters for one player from their actual records. */
export async function recomputePlayerStats(userId: string): Promise<void> {
  const [results, gamesCreated, gamesJoined, tournaments, wins, participations] = await Promise.all([
    prisma.matchResult.findMany({ where: { playerId: userId }, select: { isWin: true } }),
    prisma.game.count({ where: { creatorId: userId, deletedAt: null } }),
    prisma.gameParticipant.count({ where: { userId } }),
    prisma.tournamentParticipant.count({ where: { userId } }),
    prisma.tournamentMatch.count({ where: { winnerId: userId, status: "COMPLETED" } }),
    prisma.eventParticipant.count({ where: { userId } }),
  ]);

  const played = results.length;
  const won = results.filter((r) => r.isWin).length;

  const points =
    played * 10 +
    won * 5 +
    gamesCreated * 8 +
    tournaments * 15 +
    wins * 40 +
    participations * 3;

  await prisma.playerProfile.update({
    where: { userId },
    data: {
      gamesPlayed: played,
      gamesWon: won,
      gamesLost: played - won,
      gamesCreated,
      gamesJoined: gamesJoined,
      tournamentsPlayed: tournaments,
      tournamentWins: wins,
      eventsAttended: participations,
      points,
    },
  });
}

export function winRate(wins: number, played: number): number {
  if (played === 0) return 0;
  return Math.round((wins / played) * 1000) / 10;
}

export type RankingRow = {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  city: string;
  skillLevel: string | null;
  points: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winPercentage: number;
};

export type RankingScope = "NEPAL" | "CITY";

export async function getRankings(params: {
  scope: RankingScope;
  city?: string | null;
  skillLevel?: string | null;
  format?: "SINGLES" | "DOUBLES" | null;
  limit?: number;
  offset?: number;
}): Promise<RankingRow[]> {
  const limit = Math.min(params.limit ?? 50, 200);
  const profiles = await prisma.playerProfile.findMany({
    where: {
      visibility: { in: ["PUBLIC", "COMMUNITY_ONLY"] },
      user: {
        status: "ACTIVE",
        ...(params.city ? { city: params.city as never } : {}),
      },
      ...(params.skillLevel ? { skillLevel: params.skillLevel as never } : {}),
      ...(params.format
        ? { preferredFormats: { has: params.format as never } }
        : {}),
      gamesPlayed: { gt: 0 },
    },
    include: { user: { select: { id: true, username: true, fullName: true, avatarUrl: true, city: true } } },
    orderBy: [{ points: "desc" }, { gamesWon: "desc" }, { userId: "asc" }],
    take: limit,
    skip: params.offset ?? 0,
  });

  return profiles.map((profile, index) => ({
    rank: (params.offset ?? 0) + index + 1,
    userId: profile.user.id,
    username: profile.user.username,
    fullName: profile.user.fullName,
    avatarUrl: profile.user.avatarUrl,
    city: profile.user.city,
    skillLevel: profile.skillLevel,
    points: profile.points,
    gamesPlayed: profile.gamesPlayed,
    gamesWon: profile.gamesWon,
    gamesLost: profile.gamesLost,
    winPercentage: winRate(profile.gamesWon, profile.gamesPlayed),
  }));
}

/** Monthly points view derived from recorded results. */
export async function getMonthlyPoints(limit = 20) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const results = await prisma.matchResult.groupBy({
    by: ["playerId", "isWin"],
    where: { playedAt: { gte: since } },
    _count: { _all: true },
  });

  const byPlayer = new Map<string, { played: number; won: number }>();
  for (const row of results) {
    const current = byPlayer.get(row.playerId) ?? { played: 0, won: 0 };
    current.played += row._count._all;
    if (row.isWin) current.won += row._count._all;
    byPlayer.set(row.playerId, current);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...byPlayer.keys()] } },
    select: { id: true, username: true, fullName: true, avatarUrl: true, city: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return [...byPlayer.entries()]
    .map(([playerId, stats]) => ({
      playerId,
      username: userMap.get(playerId)?.username ?? "player",
      fullName: userMap.get(playerId)?.fullName ?? "Player",
      avatarUrl: userMap.get(playerId)?.avatarUrl ?? null,
      city: userMap.get(playerId)?.city ?? "OTHER_NEPAL",
      played: stats.played,
      won: stats.won,
      points: stats.played * 10 + stats.won * 5,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export type PlayerStats = Awaited<ReturnType<typeof getPlayerStats>>;

export async function getPlayerStats(userId: string) {
  const profile = await prisma.playerProfile.findUnique({ where: { userId } });
  const [followers, following, badges, favoriteCourts, recentResults] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: "asc" },
    }),
    prisma.game.groupBy({
      by: ["courtId"],
      where: { participants: { some: { userId } } },
      _count: { _all: true },
      orderBy: { _count: { courtId: "desc" } },
      take: 5,
    }),
    prisma.matchResult.findMany({
      where: { playerId: userId },
      include: { game: { select: { id: true, title: true, type: true, startsAt: true, court: { select: { name: true } } } } },
      orderBy: { playedAt: "desc" },
      take: 10,
    }),
  ]);

  const courtIds = favoriteCourts.map((c) => c.courtId).filter((id): id is string => !!id);
  const courts = courtIds.length
    ? await prisma.court.findMany({
        where: { id: { in: courtIds } },
        select: { id: true, name: true, slug: true, city: true, images: true },
      })
    : [];

  const played = profile?.gamesPlayed ?? 0;
  const won = profile?.gamesWon ?? 0;

  return {
    gamesPlayed: played,
    gamesWon: won,
    gamesLost: profile?.gamesLost ?? 0,
    gamesCreated: profile?.gamesCreated ?? 0,
    gamesJoined: profile?.gamesJoined ?? 0,
    tournamentsPlayed: profile?.tournamentsPlayed ?? 0,
    tournamentWins: profile?.tournamentWins ?? 0,
    podiums: profile?.podiums ?? 0,
    eventsAttended: profile?.eventsAttended ?? 0,
    points: profile?.points ?? 0,
    winPercentage: winRate(won, played),
    followers,
    following,
    badges,
    favoriteCourts: favoriteCourts
      .map((c) => ({
        court: courts.find((court) => court.id === c.courtId),
        visits: c._count._all,
      }))
      .filter((c) => !!c.court),
    recentResults,
  };
}

/** Skill-level ordering used for "players who may know you" (§12). */
export function adjacentSkillLevels(level: string | null): string[] {
  if (!level) return [...SKILL_LEVELS.map((s) => s.value)];
  const index = SKILL_LEVELS.findIndex((s) => s.value === level);
  if (index < 0) return [...SKILL_LEVELS.map((s) => s.value)];
  return SKILL_LEVELS.slice(Math.max(0, index - 1), index + 2).map((s) => s.value);
}

export function nepalDayKey(date: Date): string {
  return toNepalParts(date).date;
}