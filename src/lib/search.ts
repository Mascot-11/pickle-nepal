/**
 * Global search (REQUIREMENT.md §40, §67).
 *
 * Backed by PostgreSQL ILIKE with trigram-friendly ranking. The interface is
 * intentionally narrow so Meilisearch/Typesense can replace `search()` later.
 */

import "server-only";
import { prisma } from "@/lib/db";

export type SearchResults = {
  query: string;
  players: Array<{ id: string; username: string; fullName: string; avatarUrl: string | null; city: string; skillLevel: string | null }>;
  courts: Array<{ id: string; slug: string; name: string; city: string; images: string[]; indoorOutdoor: string; pricePerHour: number | null }>;
  clubs: Array<{ id: string; slug: string; name: string; city: string; logoUrl: string | null; isVerified: boolean }>;
  coaches: Array<{ id: string; slug: string; name: string; city: string; photoUrl: string | null; isVerified: boolean }>;
  games: Array<{ id: string; title: string | null; startsAt: Date; city: string; type: string; courtName: string }>;
  events: Array<{ id: string; slug: string; title: string; startsAt: Date; city: string; type: string }>;
  tournaments: Array<{ id: string; slug: string; name: string; startsAt: Date; city: string; status: string }>;
  posts: Array<{ id: string; content: string; createdAt: Date; authorName: string }>;
};

export const EMPTY_SEARCH: SearchResults = {
  query: "",
  players: [],
  courts: [],
  clubs: [],
  coaches: [],
  games: [],
  events: [],
  tournaments: [],
  posts: [],
};

const PER_GROUP = 5;

function likeQuery(term: string): string {
  return `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
}

export async function search(term: string): Promise<SearchResults> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return { ...EMPTY_SEARCH };

  const [players, courts, clubs, coaches, games, events, tournaments, posts] = await Promise.all([
    prisma.playerProfile.findMany({
      where: {
        visibility: { in: ["PUBLIC", "COMMUNITY_ONLY"] },
        user: {
          status: "ACTIVE",
          deletedAt: null,
          OR: [{ fullName: { contains: trimmed, mode: "insensitive" } }, { username: { contains: trimmed, mode: "insensitive" } }],
        },
      },
      select: {
        userId: true,
        skillLevel: true,
        user: { select: { id: true, username: true, fullName: true, avatarUrl: true, city: true } },
      },
      take: PER_GROUP,
    }),
    prisma.court.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ name: { contains: trimmed, mode: "insensitive" } }, { address: { contains: trimmed, mode: "insensitive" } }],
      },
      select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true, pricePerHour: true },
      take: PER_GROUP,
    }),
    prisma.club.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: { contains: trimmed, mode: "insensitive" } }, { description: { contains: trimmed, mode: "insensitive" } }],
      },
      select: { id: true, slug: true, name: true, city: true, logoUrl: true, isVerified: true },
      take: PER_GROUP,
    }),
    prisma.coachProfile.findMany({
      where: {
        OR: [
          { bio: { contains: trimmed, mode: "insensitive" } },
          { user: { fullName: { contains: trimmed, mode: "insensitive" } } },
        ],
      },
      select: { id: true, slug: true, city: true, photoUrl: true, isVerified: true, user: { select: { fullName: true } } },
      take: PER_GROUP,
    }),
    prisma.game.findMany({
      where: {
        status: { in: ["OPEN", "FULL"] },
        OR: [
          { title: { contains: trimmed, mode: "insensitive" } },
          { description: { contains: trimmed, mode: "insensitive" } },
          { court: { name: { contains: trimmed, mode: "insensitive" } } },
        ],
      },
      select: { id: true, title: true, startsAt: true, city: true, type: true, court: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: PER_GROUP,
    }),
    prisma.event.findMany({
      where: {
        isCancelled: false,
        OR: [{ title: { contains: trimmed, mode: "insensitive" } }, { description: { contains: trimmed, mode: "insensitive" } }],
      },
      select: { id: true, slug: true, title: true, startsAt: true, city: true, type: true },
      orderBy: { startsAt: "asc" },
      take: PER_GROUP,
    }),
    prisma.tournament.findMany({
      where: {
        OR: [{ name: { contains: trimmed, mode: "insensitive" } }, { venue: { contains: trimmed, mode: "insensitive" } }],
      },
      select: { id: true, slug: true, name: true, startsAt: true, city: true, status: true },
      orderBy: { startsAt: "asc" },
      take: PER_GROUP,
    }),
    prisma.communityPost.findMany({
where: {
        isHidden: false,
        deletedAt: null,
        content: { contains: trimmed, mode: "insensitive" } },
      select: { id: true, content: true, createdAt: true, author: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: PER_GROUP,
    }),
  ]);

  return {
    query: trimmed,
    players: players.map((p) => ({
      id: p.user.id,
      username: p.user.username,
      fullName: p.user.fullName,
      avatarUrl: p.user.avatarUrl,
      city: p.user.city,
      skillLevel: p.skillLevel,
    })),
    courts,
    clubs,
    coaches: coaches.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.user.fullName,
      city: c.city,
      photoUrl: c.photoUrl,
      isVerified: c.isVerified,
    })),
    games: games.map((g) => ({ ...g, courtName: g.court.name })),
    events,
    tournaments,
    posts: posts.map((p) => ({ ...p, authorName: p.author.fullName })),
  };
}

export function totalSearchHits(results: SearchResults): number {
  return (
    results.players.length +
    results.courts.length +
    results.clubs.length +
    results.coaches.length +
    results.games.length +
    results.events.length +
    results.tournaments.length +
    results.posts.length
  );
}

export { patternOf };
function patternOf(term: string): string {
  return likeQuery(term);
}