import Link from "next/link";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { GameCard } from "@/components/games/game-card";
import { CourtCard } from "@/components/courts/court-card";
import { Avatar } from "@/components/ui/misc";
import { formatTimeRange, formatDateShort } from "@/lib/dates";
import { formatPrice, cityLabel, SKILL_LABELS } from "@/lib/nepal";
import { prisma } from "@/lib/db";
import type { GameWithRelations } from "@/lib/games/queries";

export default async function HomePage() {
  const now = new Date();

  const [openGames, courts, players, events, tournament, posts, cityCounts] = await Promise.all([
    getFeaturedGames(now),
    prisma.court.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        images: true,
        indoorOutdoor: true,
        pricePerHour: true,
      },
    }),
    prisma.playerProfile.findMany({
      where: {
        visibility: { in: ["PUBLIC", "COMMUNITY_ONLY"] },
        user: { status: "ACTIVE" },
        gamesPlayed: { gte: 3 },
      },
      include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true, city: true } } },
      orderBy: { points: "desc" },
      take: 8,
    }),
    prisma.event.findMany({
      where: { isCancelled: false, startsAt: { gte: now } },
      include: { _count: { select: { participants: true } } },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.tournament.findFirst({
      where: { status: { in: ["REGISTRATION_OPEN", "UPCOMING", "LIVE"] } },
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { participants: true } } },
    }),
    prisma.communityPost.findMany({
      where: { isHidden: false, deletedAt: null },
      include: {
        author: { select: { fullName: true, username: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.court.groupBy({
      by: ["city"],
      _count: { _all: true },
      orderBy: { _count: { city: "desc" } },
    }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-brand-800 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,214,102,0.4), transparent 40%)",
          }}
        />
        <Container className="relative py-16 sm:py-24">
          <div className="max-w-3xl">
            <Badge tone="accent" className="mb-4">
              Built for Nepal
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find your people. Find your game.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-brand-100 sm:text-lg">
              Connect with pickleball players across Nepal, discover courts, join open games, follow
              tournaments, and grow the community.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/games" size="lg" variant="accent">
                Find a Game
              </ButtonLink>
              <ButtonLink
                href="/courts"
                size="lg"
                className="border-2 border-white/60 text-white hover:bg-white/10"
              >
                Explore Courts
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-white/20 pt-6">
              {[
                { label: "Open games", value: openGames.length },
                { label: "Courts", value: courts.length },
                { label: "Active players", value: players.length },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs uppercase tracking-wide text-brand-200">{stat.label}</dt>
                  <dd className="text-2xl font-bold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      <Container className="py-14">
        <SectionHeading
          eyebrow="Find a Game"
          title="Games open right now"
          description="Join an open game this week, or start your own in under a minute."
          action={
            <ButtonLink href="/games" variant="secondary">
              See all games
            </ButtonLink>
          }
        />
        {openGames.length === 0 ? (
          <EmptyState
            title="No open games in your area right now"
            description="There are no open games in Kathmandu right now. Be the first to create one."
            action={<ButtonLink href="/games/create">Create a Game</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openGames.map((game) => (
              <GameCard key={game.id} game={game} now={now} />
            ))}
          </div>
        )}
      </Container>

      <section className="border-y border-line bg-brand-50/50 py-14">
        <Container>
          <SectionHeading
            eyebrow="Explore Courts"
            title="Courts around Nepal"
            description="Browse by city, or use the map to see what is close by."
            action={
              <ButtonLink href="/courts" variant="secondary">
                All courts
              </ButtonLink>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courts.map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-14">
        <SectionHeading
          eyebrow="Meet Players"
          title="Players you may know"
          description="Follow players to keep up with their games and tournaments."
          action={
            <ButtonLink href="/players" variant="secondary">
              Find players
            </ButtonLink>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {players.map((profile) => (
            <Card key={profile.userId}>
              <Link href={`/players/${profile.user.username}`} className="flex items-start gap-3">
                <Avatar name={profile.user.fullName} src={profile.user.avatarUrl} size={48} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{profile.user.fullName}</p>
                  <p className="truncate text-xs text-ink-soft">
                    @{profile.user.username} · {cityLabel(profile.user.city)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-brand-700">
                    {profile.skillLevel ? SKILL_LABELS[profile.skillLevel] : "Level not set"}
                    {profile.duprRating ? ` · DUPR ${profile.duprRating.toFixed(2)}` : ""}
                  </p>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </Container>

      {(events.length > 0 || tournament) && (
        <section className="border-y border-line bg-accent-100/40 py-14">
          <Container>
            <div className="grid gap-8 lg:grid-cols-2">
              {events.length > 0 ? (
                <div>
                  <SectionHeading eyebrow="Upcoming Events" title="What's on" />
                  <ul className="space-y-3">
                    {events.map((event) => (
                      <li key={event.id}>
                        <Link
                          href={`/events/${event.slug}`}
                          className="block rounded-2xl border border-line bg-surface-raised p-4 hover:border-brand-300"
                        >
                          <p className="font-semibold text-ink">{event.title}</p>
                          <p className="mt-0.5 text-sm text-ink-soft">
                            {formatDateShort(event.startsAt)} · {formatTimeRange(event.startsAt, event.endsAt)} ·{" "}
                            {cityLabel(event.city)}
                          </p>
                          <p className="mt-1 text-xs text-ink-soft">
                            {event._count.participants}
                            {event.capacity ? ` / ${event.capacity}` : ""} attending
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <ButtonLink href="/events" variant="secondary" className="mt-4">
                    All events
                  </ButtonLink>
                </div>
              ) : null}

              {tournament ? (
                <div>
                  <SectionHeading eyebrow="Tournament Spotlight" title={tournament.name} />
                  <Card className="bg-brand-900 text-white">
                    <Badge tone="accent">{tournament.status.replace(/_/g, " ")}</Badge>
                    <p className="mt-3 text-sm text-brand-100">
                      {formatDateShort(tournament.startsAt)} – {formatDateShort(tournament.endsAt)} ·{" "}
                      {cityLabel(tournament.city)}
                    </p>
                    <p className="mt-1 text-sm text-brand-100">
                      Entry {tournament.entryFee > 0 ? formatPrice(tournament.entryFee) : "Free"} ·{" "}
                      {tournament._count.participants} registered
                    </p>
                    <ButtonLink href={`/tournaments/${tournament.slug}`} className="mt-4" variant="accent">
                      View tournament
                    </ButtonLink>
                  </Card>
                </div>
              ) : null}
            </div>
          </Container>
        </section>
      )}

      {posts.length > 0 ? (
        <Container className="py-14">
          <SectionHeading
            eyebrow="Community"
            title="From the feed"
            action={
              <ButtonLink href="/community" variant="secondary">
                Open community
              </ButtonLink>
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="flex flex-col rounded-2xl border border-line bg-surface-raised p-5 hover:border-brand-300"
              >
                <p className="line-clamp-4 text-sm text-ink">{post.content}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                  <Avatar name={post.author.fullName} src={post.author.avatarUrl} size={28} />
                  <span className="text-xs font-medium text-ink-soft">{post.author.fullName}</span>
                  <span className="ml-auto text-xs text-ink-soft">
                    ♥ {post._count.likes} · 💬 {post._count.comments}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      ) : null}

      <section className="border-t border-line py-14">
        <Container>
          <SectionHeading
            eyebrow="Cities"
            title="Play near you"
            description="No GPS needed — pick your city and we will show what is happening."
          />
          <div className="flex flex-wrap gap-2">
            {cityCounts.map((row) => (
              <Link
                key={row.city}
                href={`/games?city=${row.city.toLowerCase()}`}
                className="rounded-full border border-line bg-surface-raised px-4 py-2 text-sm font-medium hover:border-brand-400 hover:bg-brand-50"
              >
                {cityLabel(row.city)}
                <span className="ml-1.5 text-xs text-ink-soft">{row._count._all} courts</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand-700 py-16 text-white">
        <Container className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to get on court?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Create a free account, tell us your city and level, and we will help you find your next
            game.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" size="lg" variant="accent">
              Join PickleNepal
            </ButtonLink>
            <ButtonLink
              href="/about"
              size="lg"
              className="border-2 border-white/60 text-white hover:bg-white/10"
            >
              Learn more
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}

async function getFeaturedGames(now: Date): Promise<GameWithRelations[]> {
  const games = await prisma.game.findMany({
    where: {
      status: { in: ["OPEN", "FULL"] },
      startsAt: { gte: now },
    },
    include: {
      court: { select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true } },
      creator: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      _count: { select: { participants: true, waitlist: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 6,
  });

  return games as unknown as GameWithRelations[];
}