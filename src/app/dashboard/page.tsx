import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listGames } from "@/lib/games/queries";
import { adjacentSkillLevels, RANKING_LABEL } from "@/lib/stats";
import { prisma } from "@/lib/db";
import { unreadNotificationCount } from "@/lib/notifications/service";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, StatTile } from "@/components/ui/primitives";
import { GameCard } from "@/components/games/game-card";
import { PostCard } from "@/components/community/post-card";
import { Avatar } from "@/components/ui/misc";
import { relativeDayLabel, timeAgo } from "@/lib/dates";
import { cityLabel, formatPrice } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (!user.isOnboarded) redirect("/onboarding");

  const { welcome } = await searchParams;
  const now = new Date();

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    select: {
      skillLevel: true,
      points: true,
      gamesPlayed: true,
      gamesCreated: true,
      onboardingStep: true,
      availability: true,
    },
  });

  const [nearGames, nextGame, myUpcoming, unread, messages, events, tournament, players, posts, courts] =
    await Promise.all([
      listGames({ city: user.city as never, limit: 4, viewerId: user.id }),
      prisma.gameParticipant.findFirst({
        where: { userId: user.id, game: { status: { in: ["OPEN", "FULL"] }, startsAt: { gte: now } } },
        include: {
          game: {
            include: {
              court: { select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true } },
              creator: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
              _count: { select: { participants: true, waitlist: true } },
            },
          },
        },
        orderBy: { game: { startsAt: "asc" } },
      }),
      prisma.gameParticipant.findMany({
        where: { userId: user.id, game: { startsAt: { gte: now }, status: { in: ["OPEN", "FULL", "STARTED"] } } },
        include: {
          game: {
            include: {
              court: { select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true } },
              creator: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
              _count: { select: { participants: true, waitlist: true } },
            },
          },
        },
        orderBy: { game: { startsAt: "asc" } },
        take: 4,
      }),
      unreadNotificationCount(user.id),
      prisma.conversationParticipant.aggregate({
        where: { userId: user.id },
        _sum: { unreadCount: true },
      }),
      prisma.event.findMany({
        where: { startsAt: { gte: now }, isCancelled: false },
        include: { _count: { select: { participants: true } } },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      prisma.tournament.findFirst({
        where: { status: { in: ["REGISTRATION_OPEN", "UPCOMING", "LIVE"] } },
        orderBy: { startsAt: "asc" },
        include: { _count: { select: { participants: true } } },
      }),
      prisma.playerProfile.findMany({
        where: {
          userId: { not: user.id },
          visibility: { in: ["PUBLIC", "COMMUNITY_ONLY"] },
          user: { status: "ACTIVE" },
          ...(profile?.skillLevel ? { skillLevel: { in: adjacentSkillLevels(profile.skillLevel) as never } } : {}),
        },
        include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true, city: true } } },
        orderBy: { points: "desc" },
        take: 6,
      }),
      prisma.communityPost.findMany({
        where: { isHidden: false, deletedAt: null },
        include: {
          author: { select: { id: true, fullName: true, username: true, avatarUrl: true, city: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.court.findMany({
        where: { city: user.city as never, isActive: true, deletedAt: null },
        select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true, pricePerHour: true },
        take: 4,
      }),
    ]);

  const unreadMessages = messages._sum.unreadCount ?? 0;

  return (
    <Container className="py-8">
      {welcome === "1" ? (
        <p className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm font-medium text-brand-800">
          Welcome to PickleNepal! Here is what you can do next — the quickest way to meet people is to
          join a game.
        </p>
      ) : null}

      <SectionHeading
        eyebrow="Your next steps"
        title={`What can you do now, ${user.fullName.split(" ")[0]}?`}
        description={`Games near you in ${cityLabel(user.city)}, and anything waiting on you.`}
        action={<ButtonLink href="/games/create">Create a Game</ButtonLink>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Unread notifications" value={unread} />
        <StatTile label="Unread messages" value={unreadMessages} />
        <StatTile label="Games played" value={profile?.gamesPlayed ?? 0} />
        <StatTile label="Community points" value={profile?.points ?? 0} hint={RANKING_LABEL} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">Your next game</h2>
          <Link href="/games/my-games" className="text-sm font-semibold text-brand-700 hover:underline">
            All my games
          </Link>
        </div>

        {nextGame ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <GameCard key={nextGame.game.id} game={nextGame.game as never} now={now} />
            <Card className="sm:col-span-1 lg:col-span-2">
              <h3 className="font-semibold text-ink">Also coming up</h3>
              {myUpcoming.length <= 1 ? (
                <p className="mt-2 text-sm text-ink-soft">Nothing else booked yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {myUpcoming.slice(1).map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={`/games/${entry.game.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm hover:border-brand-300"
                      >
                        <span className="truncate font-medium text-ink">
                          {entry.game.title ?? entry.game.court.name}
                        </span>
                        <span className="shrink-0 text-ink-soft">{relativeDayLabel(entry.game.startsAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ) : (
          <EmptyState
            title={`No games booked in ${cityLabel(user.city)}`}
            description="Join an open game or create your own so other players can find you."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href={`/games?city=${user.city.toLowerCase()}`}>Find a game</ButtonLink>
                <ButtonLink href="/games/create" variant="secondary">
                  Create a Game
                </ButtonLink>
              </div>
            }
          />
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">Games near you</h2>
          <Link href={`/games?city=${user.city.toLowerCase()}`} className="text-sm font-semibold text-brand-700 hover:underline">
            See all in {cityLabel(user.city)}
          </Link>
        </div>
        {nearGames.games.length === 0 ? (
          <EmptyState
            title={`No open games in ${cityLabel(user.city)} right now`}
            description="There are no open games in this city right now. Be the first to create one."
            action={<ButtonLink href="/games/create">Create a Game</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nearGames.games.map((game) => (
              <GameCard key={game.id} game={game} now={now} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          {courts.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Nearby courts</h2>
              <ul className="mt-4 space-y-2">
                {courts.map((court) => (
                  <li key={court.id}>
                    <Link
                      href={`/courts/${court.slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised p-4 text-sm hover:border-brand-300"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{court.name}</span>
                        <span className="block text-xs text-ink-soft">
                          {court.indoorOutdoor === "INDOOR" ? "Indoor" : "Outdoor"} ·{" "}
                          {court.pricePerHour ? `${formatPrice(court.pricePerHour)}/hr` : "Pricing on request"}
                        </span>
                      </span>
                      <Badge tone="brand">View</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {posts.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Community</h2>
              <ul className="mt-4 space-y-4">
                {posts.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post as never} viewer={user} />
                  </li>
                ))}
              </ul>
              <Link href="/community" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
                Open the full feed
              </Link>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          {players.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">Players you may know</h2>
              <ul className="mt-3 space-y-3">
                {players.map((player) => (
                  <li key={player.userId} className="flex items-center gap-3">
                    <Avatar name={player.user.fullName} src={player.user.avatarUrl} size={36} />
                    <div className="min-w-0">
                      <Link href={`/players/${player.user.username}`} className="block truncate text-sm font-semibold text-ink hover:text-brand-800">
                        {player.user.fullName}
                      </Link>
                      <p className="truncate text-xs text-ink-soft">{cityLabel(player.user.city)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/players" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
                Browse all players
              </Link>
            </Card>
          ) : null}

          {events.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">Upcoming events</h2>
              <ul className="mt-3 space-y-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <Link href={`/events/${event.slug}`} className="block text-sm hover:text-brand-800">
                      <span className="font-medium text-ink">{event.title}</span>
                      <span className="block text-xs text-ink-soft">
                        {relativeDayLabel(event.startsAt)} · {event._count.participants} going
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {tournament ? (
            <Card>
              <h2 className="font-semibold text-ink">Tournament open for registration</h2>
              <p className="mt-1 text-sm text-ink-soft">{tournament.name}</p>
              <p className="text-xs text-ink-soft">
                {formatPrice(tournament.entryFee)} · {tournament._count.participants} registered
              </p>
              <ButtonLink href={`/tournaments/${tournament.slug}`} className="mt-3 w-full" size="sm">
                View tournament
              </ButtonLink>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-semibold text-ink">Your profile</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {profile?.skillLevel ? "Level set" : "Add your level so players can find you"}
            </p>
            <ButtonLink href="/profile/edit" variant="secondary" size="sm" className="mt-3 w-full">
              Edit profile
            </ButtonLink>
            <p className="mt-3 text-xs text-ink-soft">Updated {timeAgo(now)}</p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}