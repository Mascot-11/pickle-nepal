/**
 * Badge award engine (REQUIREMENT.md §35).
 *
 * Rules are declarative and evaluated from a player's aggregate stats, so
 * awarding is idempotent and never depends on client input.
 */

import "server-only";
import { prisma } from "@/lib/db";

export const BADGE_DEFINITIONS = [
  { key: "first_game", name: "First Game", description: "Played your first game on PickleNepal.", icon: "🎾", threshold: 1, stat: "gamesPlayed" },
  { key: "ten_games", name: "10 Games Played", description: "Played 10 games.", icon: "🏅", threshold: 10, stat: "gamesPlayed" },
  { key: "twenty_five_games", name: "25 Games Played", description: "Played 25 games.", icon: "🥈", threshold: 25, stat: "gamesPlayed" },
  { key: "fifty_games", name: "50 Games Played", description: "Played 50 games.", icon: "🏆", threshold: 50, stat: "gamesPlayed" },
  { key: "game_creator", name: "Game Creator", description: "Created your first game.", icon: "📣", threshold: 1, stat: "gamesCreated" },
  { key: "ten_games_created", name: "Regular Host", description: "Created 10 games.", icon: "🎯", threshold: 10, stat: "gamesCreated" },
  { key: "tournament_debut", name: "Tournament Debut", description: "Entered your first tournament.", icon: "🎟️", threshold: 1, stat: "tournamentAppearances" },
  { key: "tournament_winner", name: "Tournament Winner", description: "Won a tournament.", icon: "👑", threshold: 1, stat: "tournamentWins" },
  { key: "court_explorer", name: "Court Explorer", description: "Played at 5 different courts.", icon: "🗺️", threshold: 5, stat: "distinctCourts" },
  { key: "weekend_warrior", name: "Weekend Warrior", description: "Played 8 weekend games.", icon: "🛹", threshold: 8, stat: "weekendGames" },
  { key: "community_builder", name: "Community Builder", description: "Hosted 5 games for other players.", icon: "🤝", threshold: 5, stat: "gamesCreated" },
  { key: "first_win", name: "First Win", description: "Recorded your first win.", icon: "🙌", threshold: 1, stat: "gamesWon" },
] as const;

export type BadgeStats = {
  gamesPlayed: number;
  gamesCreated: number;
  gamesWon: number;
  tournamentAppearances: number;
  tournamentWins: number;
  distinctCourts: number;
  weekendGames: number;
};

/** Recomputes badge eligibility for a user and awards anything new. */
export async function evaluateBadges(userId: string): Promise<string[]> {
  const [profile, distinctCourts, weekendGames] = await Promise.all([
    prisma.playerProfile.findUnique({ where: { userId } }),
    prisma.gameParticipant.findMany({
      where: { userId, game: { deletedAt: null } },
      select: { gameId: true },
      distinct: ["gameId"],
    }).then((rows) => rows.length),
    prisma.game.count({
      where: {
        participants: { some: { userId } },
        startsAt: { gte: weekendFloor(new Date()) },
      } as never,
    }),
  ]);

  const stats: BadgeStats = {
    gamesPlayed: profile?.gamesPlayed ?? 0,
    gamesCreated: profile?.gamesCreated ?? 0,
    gamesWon: profile?.gamesWon ?? 0,
    tournamentAppearances: profile?.tournamentsPlayed ?? 0,
    tournamentWins: profile?.tournamentWins ?? 0,
    distinctCourts,
    weekendGames,
  };

  const existing = await prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } });
  const existingBadgeIds = new Set(existing.map((e) => e.badgeId));

  const awarded: string[] = [];
  for (const definition of BADGE_DEFINITIONS) {
    const value = stats[definition.stat as keyof BadgeStats] ?? 0;
    if (value < definition.threshold) continue;

    const badge = await prisma.badge.upsert({
      where: { key: definition.key },
      create: {
        key: definition.key,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        threshold: definition.threshold,
      },
      update: {},
    });
    if (existingBadgeIds.has(badge.id)) continue;

    await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
    awarded.push(definition.key);
  }

  return awarded;
}

function weekendFloor(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = day >= 6 ? day - 6 : day + 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function seedBadges(): Promise<void> {
  for (const definition of BADGE_DEFINITIONS) {
    await prisma.badge.upsert({
      where: { key: definition.key },
      create: {
        key: definition.key,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        threshold: definition.threshold,
      },
      update: { name: definition.name, description: definition.description, icon: definition.icon },
    });
  }
}