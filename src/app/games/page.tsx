import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { listGames, PAGE_SIZE } from "@/lib/games/queries";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { GameCard } from "@/components/games/game-card";
import { GameFilters } from "@/components/games/game-filters";
import { Pagination } from "@/components/ui/misc";
import { cityLabel } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Find a pickleball game in Nepal",
  description:
    "Browse open pickleball games in Kathmandu, Lalitpur, Pokhara and beyond. Filter by city, date, skill level, format and price, then join a game.",
  alternates: { canonical: "/games" },
  openGraph: {
    title: "Find a pickleball game in Nepal | PickleNepal",
    description: "Open games, doubles partners and beginner-friendly sessions across Nepal.",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const page = Math.max(1, Number(single(params.page) ?? "1") || 1);

  const { games, total, pageCount } = await listGames({
    city: single(params.city)?.toUpperCase() ?? null,
    skill: single(params.skill)?.toUpperCase() ?? null,
    format: single(params.format)?.toUpperCase() ?? null,
    type: single(params.type)?.toUpperCase() ?? null,
    courtId: single(params.court),
    price: single(params.price) as "free" | "paid" | null,
    indoorOutdoor: single(params.indoorOutdoor)?.toUpperCase() ?? null,
    q: single(params.q),
    sort: (single(params.sort) as "soonest" | "newest" | "players" | null) ?? null,
    page,
    limit: PAGE_SIZE,
  });

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const flat = single(value);
      if (flat && key !== "page") search.set(key, flat);
    }
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/games?${query}` : "/games";
  };

  const activeCity = single(params.city)?.toUpperCase();

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Find a Game"
        title={activeCity ? `Open games in ${cityLabel(activeCity)}` : "Open games across Nepal"}
        description={`${total} ${total === 1 ? "game" : "games"} available. Join one, or create your own.`}
        action={
          user ? (
            <ButtonLink href="/games/create">Create a Game</ButtonLink>
          ) : (
            <ButtonLink href="/login?next=/games/create">Log in to create a game</ButtonLink>
          )
        }
      />

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <aside className="mb-6 lg:mb-0">
          <GameFilters />
        </aside>

        <section aria-label="Game results">
          {games.length === 0 ? (
            <EmptyState
              title={
                activeCity
                  ? `No open games in ${cityLabel(activeCity)} right now`
                  : "No open games match these filters"
              }
              description={
                activeCity
                  ? `No open games in ${cityLabel(activeCity)} right now. Try another city, or start one yourself.`
                  : "Try clearing a filter, or be the first to create a game in your area."
              }
              action={
                user ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    <ButtonLink href="/games/create">Create a Game</ButtonLink>
                    {single(params.city) || single(params.skill) ? (
                      <ButtonLink href="/games" variant="secondary">
                        Clear filters
                      </ButtonLink>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    <ButtonLink href="/login?next=/games/create">Log in to create</ButtonLink>
                    <ButtonLink href="/register" variant="secondary">
                      Join PickleNepal
                    </ButtonLink>
                  </div>
                )
              }
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} now={new Date()} />
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
              <p className="mt-4 text-center text-sm text-ink-soft">
                Looking for players instead?{" "}
                <Link href="/players" className="font-medium text-brand-700 hover:underline">
                  Browse the player directory
                </Link>
              </p>
            </>
          )}
        </section>
      </div>
    </Container>
  );
}