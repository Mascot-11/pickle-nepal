import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { Pagination } from "@/components/ui/misc";
import { PlayerCard, PlayerFilters, type PlayerCardData } from "@/components/players/player-card";
import { cityLabel } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Find pickleball players in Nepal",
  description:
    "Search pickleball players by city, skill level, DUPR rating, format, position and availability. Follow players and invite them to your games.",
  alternates: { canonical: "/players" },
};

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function parseDupr(range: string | null): { gte?: number; lt?: number } | null {
  if (!range) return null;
  const [low, high] = range.split("-").map(Number);
  if (Number.isNaN(low)) return null;
  return high && !Number.isNaN(high) ? { gte: low, lt: high + 1 } : { gte: low };
}

export default async function PlayersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const viewer = await getCurrentUser();

  const page = Math.max(1, Number(single(params.page) ?? '1') || 1);
  const q = single(params.q);

  const where: Prisma.PlayerProfileWhereInput = {
    visibility: { in: ["PUBLIC", "COMMUNITY_ONLY"] },
    user: {
      status: "ACTIVE",
      deletedAt: null,
      ...(single(params.city) ? { city: single(params.city)!.toUpperCase() as never } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" as const } },
              { username: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    ...(single(params.skill) ? { skillLevel: single(params.skill)!.toUpperCase() as never } : {}),
    ...(single(params.format) ? { preferredFormats: { has: single(params.format)!.toUpperCase() as never } } : {}),
    ...(single(params.position) ? { position: single(params.position)!.toUpperCase() as never } : {}),
    ...(single(params.availability)
      ? { availability: { has: single(params.availability)!.toUpperCase() as never } }
      : {}),
    ...(parseDupr(single(params.dupr)) ? { duprRating: parseDupr(single(params.dupr))! } : {}),
  };

  const [profiles, total] = await Promise.all([
    prisma.playerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            city: true,
          },
        },
      },
      orderBy: [{ points: "desc" }, { user: { fullName: "asc" } }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.playerProfile.count({ where }),
  ]);

  const follows = viewer
    ? await prisma.follow.findMany({
        where: { followerId: viewer.id, followingId: { in: profiles.map((p) => p.userId) } },
        select: { followingId: true },
      })
    : [];
  const followingIds = new Set(follows.map((f) => f.followingId));

  const players: PlayerCardData[] = profiles.map((profile) => ({
    userId: profile.user.id,
    username: profile.user.username,
    fullName: profile.user.fullName,
    avatarUrl: profile.user.avatarUrl,
    city: profile.user.city,
    skillLevel: profile.skillLevel,
    duprRating: profile.duprRating,
    formats: profile.preferredFormats,
    position: profile.position,
    availability: profile.availability,
    isFollowing: followingIds.has(profile.userId),
  }));

  const pageCount = Math.ceil(total / PAGE_SIZE);

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const flat = single(value);
      if (flat && key !== "page") search.set(key, flat);
    }
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/players?${query}` : "/players";
  };

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Find Players"
        title={single(params.city) ? `Players in ${cityLabel(single(params.city)!.toUpperCase())}` : "Players across Nepal"}
        description={`${total} ${total === 1 ? "player" : "players"} found. Follow the ones you would play with.`}
        action={
          viewer ? (
            <ButtonLink href="/games/create">Create a Game</ButtonLink>
          ) : (
            <ButtonLink href="/register">Join PickleNepal</ButtonLink>
          )
        }
      />

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <aside className="mb-6 lg:mb-0">
          <PlayerFilters />
        </aside>

        <section aria-label="Players">
          {players.length === 0 ? (
            <EmptyState
              title="No players match your filters"
              description="Try removing a filter, or searching for a different city."
              action={<ButtonLink href="/players" variant="secondary">Clear Filters</ButtonLink>}
              icon="👥"
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {players.map((player) => (
                  <PlayerCard key={player.userId} player={player} />
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
            </>
          )}
        </section>
      </div>
    </Container>
  );
}