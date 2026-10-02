import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * The single include shape used by game cards and the detail page, so a card and
 * its detail page never disagree about what data exists (§102.7 — queries in
 * one place, presentation elsewhere).
 */
export const gameCardInclude = {
  court: {
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      images: true,
      indoorOutdoor: true,
    },
  },
  creator: {
    select: { id: true, fullName: true, username: true, avatarUrl: true },
  },
  _count: { select: { participants: true, waitlist: true } },
} satisfies Prisma.GameInclude;

export type GameWithRelations = Prisma.GameGetPayload<{ include: typeof gameCardInclude }>;

export type GameFilters = {
  city?: string | null;
  date?: string | null;
  quick?: string | null;
  skill?: string | null;
  format?: string | null;
  type?: string | null;
  courtId?: string | null;
  price?: "free" | "paid" | null;
  indoorOutdoor?: string | null;
  q?: string | null;
  sort?: "soonest" | "newest" | "players" | null;
  page?: number;
  limit?: number;
  excludeUserId?: string | null;
  viewerId?: string | null;
};

export const PAGE_SIZE = 12;

export async function listGames(filters: GameFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(filters.limit ?? PAGE_SIZE, 48);
  const now = new Date();

  const where: Prisma.GameWhereInput = {
    status: { in: ["OPEN", "FULL"] },
    startsAt: { gte: now },
  };

  if (filters.city) where.city = filters.city as never;
  if (filters.skill) where.skillLevel = filters.skill as never;
  if (filters.format) where.format = filters.format as never;
  if (filters.type) where.type = filters.type as never;
  if (filters.courtId) where.courtId = filters.courtId;
  if (filters.indoorOutdoor) where.court = { indoorOutdoor: filters.indoorOutdoor as never };
  if (filters.price === "free") where.OR = [{ pricePerPerson: null }, { pricePerPerson: 0 }];
  if (filters.price === "paid") where.pricePerPerson = { gt: 0 };
  if (filters.q) {
    where.AND = [
      {
        OR: [
          { title: { contains: filters.q, mode: "insensitive" } },
          { description: { contains: filters.q, mode: "insensitive" } },
          { court: { name: { contains: filters.q, mode: "insensitive" } } },
        ],
      },
    ];
  }

  // Date / quick filters are computed in Nepal local time by the caller and
  // passed through as an absolute window to avoid server-timezone drift.
  if (filters.date) {
    where.startsAt = { gte: filters.date as unknown as Date, lte: filters.date as unknown as Date };
  }

  const orderBy: Prisma.GameOrderByWithRelationInput[] =
    filters.sort === "newest"
      ? [{ createdAt: "desc" }]
      : filters.sort === "players"
        ? [{ participants: { _count: "desc" } }, { startsAt: "asc" }]
        : [{ startsAt: "asc" }];

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      include: gameCardInclude,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.game.count({ where }),
  ]);

  return { games: games as unknown as GameWithRelations[], total, page, pageCount: Math.ceil(total / limit) };
}

export async function getGameById(id: string, viewerId?: string | null) {
  const game = await prisma.game.findFirst({
    where: { id },
    include: {
      court: {
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          images: true,
          indoorOutdoor: true,
          surface: true,
          address: true,
          latitude: true,
          longitude: true,
          amenities: true,
          hasLighting: true,
          pricePerHour: true,
          clubId: true,
        },
      },
      creator: {
        select: { id: true, fullName: true, username: true, avatarUrl: true, bio: true, city: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, username: true, avatarUrl: true, city: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      waitlist: {
        where: { status: { in: ["WAITING", "OFFERED"] } },
        include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
        orderBy: { position: "asc" },
      },
      _count: { select: { participants: true, waitlist: true } },
    },
  });

  if (!game) return null;

  const viewerParticipant = viewerId
    ? game.participants.find((p) => p.userId === viewerId) ?? null
    : null;
  const viewerWaitlist = viewerId
    ? game.waitlist.find((w) => w.userId === viewerId) ?? null
    : null;

  return {
    ...game,
    participants: game.participants,
    waitlist: game.waitlist,
    viewer: {
      isParticipant: !!viewerParticipant,
      isWaitlisted: !!viewerWaitlist,
      waitlistPosition: viewerWaitlist?.position ?? null,
      waitlistStatus: viewerWaitlist?.status ?? null,
      isCreator: viewerId ? game.creatorId === viewerId : false,
      participantId: viewerParticipant?.id ?? null,
    },
  };
}

export type GameDetail = NonNullable<Awaited<ReturnType<typeof getGameById>>>;

/** Games the viewer already joined, plus games they created. */
export async function listViewerGames(viewerId: string) {
  const [joined, created] = await Promise.all([
    prisma.gameParticipant.findMany({
      where: { userId: viewerId },
      include: { game: { include: gameCardInclude } },
      orderBy: { game: { startsAt: "asc" } },
      take: 50,
    }),
    prisma.game.findMany({
      where: { creatorId: viewerId },
      include: gameCardInclude,
      orderBy: { startsAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    joined: joined.map((row) => row.game as unknown as GameWithRelations),
    created: created as unknown as GameWithRelations[],
  };
}