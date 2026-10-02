import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewProfile, isStaff } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { getPlayerStats, RANKING_LABEL } from "@/lib/stats";
import { formatDateShort, formatDate, relativeDayLabel } from "@/lib/dates";
import {
  AVAILABILITY_SLOTS,
  CITY_LABELS,
  PLAY_FORMATS,
  POSITIONS,
  SKILL_LABELS,
  FREQUENCIES,
} from "@/lib/nepal";
import { Container } from "@/components/ui/container";
import { Badge, Card, EmptyState, StatTile } from "@/components/ui/primitives";
import { Avatar, Breadcrumbs, MetaList } from "@/components/ui/misc";
import { PlayerProfileActions } from "@/components/players/profile-actions";
import { GameCard } from "@/components/games/game-card";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const profile = await prisma.playerProfile.findFirst({
    where: { user: { username } },
    include: { user: { select: { fullName: true, avatarUrl: true, bio: true, city: true } } },
  });
  if (!profile) return { title: "Player not found", robots: { index: false, follow: false } };

  const name = profile.user.fullName;
  const description =
    profile.user.bio ??
    `Play pickleball with ${name} on PickleNepal — ${CITY_LABELS[profile.user.city] ?? profile.user.city}${
      profile.skillLevel ? `, ${SKILL_LABELS[profile.skillLevel]}` : ""
    } player.`;

  return {
    title: `${name} (@${username})`,
    description,
    alternates: { canonical: `/players/${username}` },
    openGraph: {
      type: "profile",
      title: `${name} | PickleNepal`,
      description,
      images: profile.user.avatarUrl
        ? [{ url: profile.user.avatarUrl, width: 400, height: 400, alt: name }]
        : undefined,
    },
  };
}

export default async function PlayerProfilePage({ params }: { params: Params }) {
  const { username } = await params;
  const viewer = await getCurrentUser();

  const profile = await prisma.playerProfile.findFirst({
    where: { user: { username } },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          coverUrl: true,
          city: true,
          bio: true,
          createdAt: true,
          status: true,
          role: true,
          sellerProfile: { select: { businessName: true, isVerified: true } },
          coachProfile: { select: { slug: true, isVerified: true } },
          _count: { select: { followsReceived: true } },
        },
      },
    },
  });

  if (!profile || profile.user.status === "BANNED") notFound();

  if (!canViewProfile(viewer, { id: profile.id, userId: profile.user.id, visibility: profile.visibility })) {
    return (
      <Container className="py-16">
        <EmptyState
          title="This profile is private"
          description="This player has chosen to keep their profile limited to the community. Log in with a PickleNepal account to view it."
          icon="🔒"
        />
      </Container>
    );
  }

  const isSelf = viewer?.id === profile.user.id;
  const stats = await getPlayerStats(profile.user.id);

  const clubMemberships = await prisma.clubMember.findMany({
    where: { userId: profile.user.id },
    include: {
      club: { select: { slug: true, name: true, logoUrl: true, isVerified: true, city: true } },
    },
  });

  const [isFollowing, upcomingGames, tournaments, posts] = await Promise.all([
    viewer
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewer.id, followingId: profile.user.id } },
          select: { id: true },
        })
      : null,
    prisma.game.findMany({
      where: {
        status: { in: ["OPEN", "FULL"] },
        startsAt: { gte: new Date() },
        participants: { some: { userId: profile.user.id } },
      },
      include: {
        court: { select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true } },
        creator: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        _count: { select: { participants: true, waitlist: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.tournamentParticipant.findMany({
      where: { userId: profile.user.id },
      include: { tournament: { select: { slug: true, name: true, city: true, startsAt: true, status: true } } },
      orderBy: { registeredAt: "desc" },
      take: 5,
    }),
    prisma.communityPost.findMany({
      where: { authorId: profile.user.id, isHidden: false, deletedAt: null },
      select: { id: true, content: true, createdAt: true, type: true, _count: { select: { likes: true, comments: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const badges = stats.badges;

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Players", href: "/players" }, { label: profile.user.fullName }]} />

      <Card className="overflow-hidden p-0">
        <div className="h-28 bg-gradient-to-r from-brand-700 to-brand-500 sm:h-36" aria-hidden="true" />
        <div className="px-5 pb-5">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <Avatar name={profile.user.fullName} src={profile.user.avatarUrl} size={96} className="ring-4 ring-surface-raised" />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-ink">
                {profile.user.fullName}
                {isStaff(viewer) ? <Badge tone="danger">Staff</Badge> : null}
              </h1>
              <p className="text-sm text-ink-soft">
                @{profile.user.username} · {CITY_LABELS[profile.user.city] ?? profile.user.city} · Joined{" "}
                {formatDateShort(profile.user.createdAt)}
              </p>
            </div>
            <PlayerProfileActions
              viewerId={viewer?.id ?? null}
              targetUserId={profile.user.id}
              username={profile.user.username}
              isFollowing={!!isFollowing}
              isSelf={isSelf}
            />
          </div>

          {profile.user.bio || profile.bio ? (
            <p className="mt-4 whitespace-pre-line text-ink">{profile.user.bio ?? profile.bio}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {profile.skillLevel ? <Badge tone="brand">{SKILL_LABELS[profile.skillLevel]}</Badge> : null}
            {profile.duprRating ? <Badge tone="info">DUPR {profile.duprRating.toFixed(2)}</Badge> : null}
            {profile.preferredFormats.map((format) => (
              <Badge key={format} tone="neutral">
                {PLAY_FORMATS.find((f) => f.value === format)?.label ?? format}
              </Badge>
            ))}
            {profile.position ? (
              <Badge tone="neutral">{POSITIONS.find((p) => p.value === profile.position)?.label}</Badge>
            ) : null}
            {profile.frequency ? <Badge tone="accent">{FREQUENCIES.find((f) => f.value === profile.frequency)?.label}</Badge> : null}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Followers" value={profile.user._count.followsReceived} />
            <StatTile label="Following" value={stats.following} />
            <StatTile label="Games played" value={stats.gamesPlayed} />
            <StatTile label="Win rate" value={`${stats.winPercentage}%`} />
          </dl>

          {profile.instagram || profile.facebook ? (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {profile.instagram ? (
                <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                  Instagram
                </a>
              ) : null}
              {profile.facebook ? (
                <a href={profile.facebook} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                  Facebook
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-ink">Statistics</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Recorded from games played on PickleNepal. {RANKING_LABEL} — not an official DUPR rating.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Games played" value={stats.gamesPlayed} />
              <StatTile label="Wins" value={stats.gamesWon} />
              <StatTile label="Losses" value={stats.gamesLost} />
              <StatTile label="Games created" value={stats.gamesCreated} />
              <StatTile label="Tournaments" value={stats.tournamentsPlayed} />
              <StatTile label="Events attended" value={stats.eventsAttended} />
            </div>

            {stats.recentResults.length > 0 ? (
              <Card className="mt-4">
                <h3 className="font-semibold text-ink">Recent results</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {stats.recentResults.map((result) => (
                    <li key={result.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0">
                      <span className="truncate">
                        <span className={result.isWin ? "font-semibold text-brand-700" : "font-semibold text-ink-soft"}>
                          {result.isWin ? "Won" : "Lost"}
                        </span>{" "}
                        vs {result.opponentName ?? "opponent"} · {result.game.court.name}
                      </span>
                      <span className="shrink-0 text-ink-soft">
                        {result.scoreFor}–{result.scoreAgainst} · {relativeDayLabel(result.playedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink">Upcoming games</h2>
            {upcomingGames.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No upcoming games" description="This player has not joined a game yet." icon="🏓" />
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {upcomingGames.map((game) => (
                  <GameCard key={game.id} game={game as never} now={new Date()} />
                ))}
              </div>
            )}
          </section>

          {tournaments.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Tournament history</h2>
              <ul className="mt-4 space-y-2">
                {tournaments.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm">
                    <a href={`/tournaments/${entry.tournament.slug}`} className="truncate font-medium text-ink hover:text-brand-800">
                      {entry.tournament.name}
                    </a>
                    <span className="shrink-0 text-ink-soft">{formatDate(entry.tournament.startsAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {posts.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Recent posts</h2>
              <ul className="mt-4 space-y-3">
                {posts.map((post) => (
                  <li key={post.id} className="rounded-xl border border-line bg-surface-raised p-4">
                    <a href={`/community/${post.id}`} className="text-sm text-ink hover:text-brand-800">
                      {post.content.slice(0, 220)}
                    </a>
                    <p className="mt-1 text-xs text-ink-soft">
                      ♥ {post._count.likes} · 💬 {post._count.comments} · {relativeDayLabel(post.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="font-semibold text-ink">Availability</h2>
            {profile.availability.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Not set.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.availability.map((slot) => (
                  <Badge key={slot} tone="accent">
                    {AVAILABILITY_SLOTS.find((s) => s.value === slot)?.label ?? slot}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {clubMemberships.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">Clubs</h2>
              <ul className="mt-2 space-y-2">
                {clubMemberships.map((membership) => (
                  <li key={membership.id}>
                    <a href={`/clubs/${membership.club.slug}`} className="flex items-center gap-2 text-sm text-ink hover:text-brand-800">
                      <Avatar name={membership.club.name} src={membership.club.logoUrl} size={28} />
                      {membership.club.name}
                      {membership.club.isVerified ? <span title="Verified">✓</span> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-semibold text-ink">Badges</h2>
            {badges.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No badges yet.</p>
            ) : (
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {badges.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-line p-2 text-center">
                    <span className="text-xl" aria-hidden="true">{entry.badge.icon}</span>
                    <p className="mt-0.5 text-xs font-semibold text-ink">{entry.badge.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {stats.favoriteCourts.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">Favourite courts</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {stats.favoriteCourts.map((entry) =>
                  entry.court ? (
                    <li key={entry.court.id} className="flex items-center justify-between gap-2">
                      <a href={`/courts/${entry.court.slug}`} className="truncate text-ink hover:text-brand-800">
                        {entry.court.name}
                      </a>
                      <span className="shrink-0 text-xs text-ink-soft">{entry.visits} games</span>
                    </li>
                  ) : null,
                )}
              </ul>
            </Card>
          ) : null}

          {profile.user.role === "COACH" && profile.user.coachProfile ? (
            <Card>
              <h2 className="font-semibold text-ink">Coach</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {profile.user.coachProfile.isVerified ? "Verified coach." : "Coach profile available."}
              </p>
              <a href={`/coaches/${profile.user.coachProfile.slug}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
                View coach profile
              </a>
            </Card>
          ) : null}

          {profile.user.sellerProfile ? (
            <Card>
              <h2 className="font-semibold text-ink">Seller</h2>
              <p className="mt-1 text-sm text-ink-soft">{profile.user.sellerProfile.businessName}</p>
              <Link href="/marketplace" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
                Browse marketplace
              </Link>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-semibold text-ink">Details</h2>
            <div className="mt-3">
              <MetaList
                items={[
                  { label: "Member since", value: formatDate(profile.user.createdAt) },
                  { label: "City", value: CITY_LABELS[profile.user.city] ?? profile.user.city },
                  ...(isSelf ? [{ label: "Email", value: "Visible to you" }] : []),
                ]}
              />
            </div>
            {isSelf ? (
              <p className="mt-3 text-xs text-ink-soft">
                Your email and phone are never shown publicly. Manage them in settings.
              </p>
            ) : (
              <p className="mt-3 text-xs text-ink-soft">
                Contact details are private. Use Message to reach this player.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </Container>
  );
}