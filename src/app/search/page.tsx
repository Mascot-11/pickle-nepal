import type { Metadata } from "next";
import Link from "next/link";
import { search, totalSearchHits } from "@/lib/search";
import { Container, SectionHeading } from "@/components/ui/container";
import { EmptyState, Badge } from "@/components/ui/primitives";
import { Avatar, Breadcrumbs } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDateShort } from "@/lib/dates";
import { cityLabel, formatPrice } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await search(q) : null;
  const hits = results ? totalSearchHits(results) : 0;

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <SectionHeading
        eyebrow="Search"
        title={q ? `Results for “${q}”` : "Search PickleNepal"}
        description={results ? `${hits} ${hits === 1 ? "result" : "results"} across players, courts, clubs, coaches, games, events, tournaments and posts.` : "Search players, courts, clubs, coaches, games, events, tournaments and posts."}
      />

      <form action="/search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search PickleNepal…"
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          Search
        </button>
      </form>

      {!results ? (
        <div className="mt-8">
          <EmptyState title="What are you looking for?" description="Try a city, a court name or a player's username." icon="🔍" />
        </div>
      ) : hits === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`No results for “${q}”`}
            description="Check the spelling, or browse games and courts directly."
            icon="🔍"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/games" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                  Find a game
                </Link>
                <Link href="/courts" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:bg-brand-50">
                  Browse courts
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {results.players.length > 0 ? (
            <ResultGroup title="Players" count={results.players.length}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.players.map((player) => (
                  <li key={player.id}>
                    <Link href={`/players/${player.username}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-3 hover:border-brand-300">
                      <Avatar name={player.fullName} src={player.avatarUrl} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{player.fullName}</span>
                        <span className="block truncate text-xs text-ink-soft">
                          @{player.username} · {cityLabel(player.city)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          ) : null}

          {results.courts.length > 0 ? (
            <ResultGroup title="Courts" count={results.courts.length}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.courts.map((court) => (
                  <li key={court.id}>
                    <Link href={`/courts/${court.slug}`} className="flex h-full items-center gap-3 rounded-xl border border-line bg-surface-raised p-3 hover:border-brand-300">
                      <SmartImage src={court.images[0]} alt={court.name} className="h-14 w-20 rounded-lg" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{court.name}</span>
                        <span className="block truncate text-xs text-ink-soft">
                          {cityLabel(court.city)} · {court.pricePerHour ? `${formatPrice(court.pricePerHour)}/hr` : "Pricing on request"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          ) : null}

          {results.clubs.length > 0 ? (
            <ResultGroup title="Clubs" count={results.clubs.length}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.clubs.map((club) => (
                  <li key={club.id}>
                    <Link href={`/clubs/${club.slug}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-3 hover:border-brand-300">
                      <Avatar name={club.name} src={club.logoUrl} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{club.name}</span>
                        <span className="block truncate text-xs text-ink-soft">
                          {cityLabel(club.city)} {club.isVerified ? "· verified" : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          ) : null}

          {results.coaches.length > 0 ? (
            <ResultGroup title="Coaches" count={results.coaches.length}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.coaches.map((coach) => (
                  <li key={coach.id}>
                    <Link href={`/coaches/${coach.slug}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-3 hover:border-brand-300">
                      <Avatar name={coach.name} src={coach.photoUrl} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{coach.name}</span>
                        <span className="block truncate text-xs text-ink-soft">
                          {cityLabel(coach.city)} {coach.isVerified ? "· verified" : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          ) : null}

          {results.games.length > 0 ? (
            <ResultGroup title="Games" count={results.games.length}>
              <ul className="space-y-2">
                {results.games.map((game) => (
                  <li key={game.id}>
                    <Link href={`/games/${game.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised p-3 text-sm hover:border-brand-300">
                      <span className="truncate font-medium text-ink">{game.title ?? game.courtName}</span>
                      <span className="shrink-0 text-ink-soft">
                        {formatDateShort(game.startsAt)} · {cityLabel(game.city)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          ) : null}

          {results.events.length > 0 ? (
            <ResultGroup title="Events" count={results.events.length}>
              <ul className="space-y-2">
                {results.events.map((event) => (
                  <li key={event.id}>
                    <Link href={`/events/${event.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised p-3 text-sm hover:border-brand-300">
                      <span className="truncate font-medium text-ink">{event.title}</span>
                      <span className="shrink-0 text-ink-soft">{formatDateShort(event.startsAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          ) : null}

          {results.tournaments.length > 0 ? (
            <ResultGroup title="Tournaments" count={results.tournaments.length}>
              <ul className="space-y-2">
                {results.tournaments.map((tournament) => (
                  <li key={tournament.id}>
                    <Link href={`/tournaments/${tournament.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised p-3 text-sm hover:border-brand-300">
                      <span className="truncate font-medium text-ink">{tournament.name}</span>
                      <span className="shrink-0 text-ink-soft">
                        <Badge tone="neutral">{tournament.status.replace(/_/g, " ")}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          ) : null}

          {results.posts.length > 0 ? (
            <ResultGroup title="Posts" count={results.posts.length}>
              <ul className="space-y-2">
                {results.posts.map((post) => (
                  <li key={post.id}>
                    <Link href={`/community/${post.id}`} className="block rounded-xl border border-line bg-surface-raised p-3 text-sm hover:border-brand-300">
                      <span className="line-clamp-2 text-ink">{post.content}</span>
                      <span className="mt-1 block text-xs text-ink-soft">{post.authorName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ResultGroup>
          ) : null}
        </div>
      )}
    </Container>
  );
}

function ResultGroup({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-ink">
        {title} ({count})
      </h2>
      {children}
    </section>
  );
}