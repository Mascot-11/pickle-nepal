import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPlayerStats } from "@/lib/stats";
import { listViewerGames } from "@/lib/games/queries";
import { prisma } from "@/lib/db";
import {
  AVAILABILITY_SLOTS,
  CITY_LABELS,
  FREQUENCIES,
  PLAY_FORMATS,
  POSITIONS,
  SKILL_LABELS,
} from "@/lib/nepal";
import { formatDate } from "@/lib/dates";
import { Container } from "@/components/ui/container";
import { Avatar, Breadcrumbs } from "@/components/ui/misc";
import { Badge, Card, EmptyState, StatTile } from "@/components/ui/primitives";
import { GameCard } from "@/components/games/game-card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const [profile, stats, games, listings] = await Promise.all([
    prisma.playerProfile.findUnique({ where: { userId: user.id } }),
    getPlayerStats(user.id),
    listViewerGames(user.id),
    prisma.marketplaceListing.findMany({
      where: { sellerId: user.id, deletedAt: null },
      select: { id: true, slug: true, title: true, price: true, status: true },
      take: 5,
    }),
  ]);

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Profile" }]} />

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={user.fullName} src={user.avatarUrl} size={80} />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-ink">{user.fullName}</h1>
                <p className="text-sm text-ink-soft">
                  @{user.username} · {CITY_LABELS[user.city]} · Member since {formatDate(new Date())}
                </p>
              </div>
              <ButtonLink href="/profile/edit" variant="secondary">
                Edit profile
              </ButtonLink>
            </div>

            {profile?.bio ? <p className="mt-4 whitespace-pre-line text-ink">{profile.bio}</p> : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {profile?.skillLevel ? <Badge tone="brand">{SKILL_LABELS[profile.skillLevel]}</Badge> : null}
              {profile?.duprRating ? <Badge tone="info">DUPR {profile.duprRating.toFixed(2)}</Badge> : null}
              {profile?.preferredFormats.map((format) => (
                <Badge key={format} tone="neutral">{PLAY_FORMATS.find((f) => f.value === format)?.label}</Badge>
              ))}
              {profile?.position ? (
                <Badge tone="neutral">{POSITIONS.find((p) => p.value === profile.position)?.label}</Badge>
              ) : null}
              {profile?.frequency ? (
                <Badge tone="accent">{FREQUENCIES.find((f) => f.value === profile.frequency)?.label}</Badge>
              ) : null}
            </div>
          </Card>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Your statistics</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Games played" value={stats.gamesPlayed} />
              <StatTile label="Wins" value={stats.gamesWon} />
              <StatTile label="Win rate" value={`${stats.winPercentage}%`} />
              <StatTile label="Games created" value={stats.gamesCreated} />
              <StatTile label="Games joined" value={stats.gamesJoined} />
              <StatTile label="Tournaments" value={stats.tournamentsPlayed} />
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink">Your upcoming games</h2>
              <Link href="/games/my-games" className="text-sm font-semibold text-brand-700 hover:underline">
                Manage
              </Link>
            </div>
            {games.joined.length === 0 ? (
              <EmptyState title="No games joined yet" description="Find an open game and join it." icon="🏓" action={<ButtonLink href="/games">Find a game</ButtonLink>} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {games.joined.slice(0, 4).map((game) => (
                  <GameCard key={game.id} game={game} now={new Date()} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="font-semibold text-ink">Settings</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/profile/edit" className="text-brand-700 hover:underline">Edit profile</Link></li>
              <li><Link href="/settings" className="text-brand-700 hover:underline">Account settings</Link></li>
              <li><Link href="/settings/privacy" className="text-brand-700 hover:underline">Privacy</Link></li>
              <li><Link href="/settings/notifications" className="text-brand-700 hover:underline">Notification preferences</Link></li>
              <li><Link href="/games/saved" className="text-brand-700 hover:underline">Saved items</Link></li>
            </ul>
          </Card>

          <Card>
            <h2 className="font-semibold text-ink">Profile visibility</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {profile?.visibility === "PUBLIC"
                ? "Anyone can see your profile."
                : profile?.visibility === "COMMUNITY_ONLY"
                  ? "Only signed-in PickleNepal members can see your profile."
                  : "Only you can see your profile."}
            </p>
            <Link href="/settings/privacy" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
              Change
            </Link>
            <p className="mt-3 text-xs text-ink-soft">
              Your email, phone and account identifiers are never publicly exposed.
            </p>
          </Card>

          {profile?.availability.length ? (
            <Card>
              <h2 className="font-semibold text-ink">Availability</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.availability.map((slot) => (
                  <Badge key={slot} tone="accent">{AVAILABILITY_SLOTS.find((s) => s.value === slot)?.label}</Badge>
                ))}
              </div>
            </Card>
          ) : null}

          {stats.badges.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">Badges</h2>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {stats.badges.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-line p-2 text-center">
                    <span className="text-xl" aria-hidden="true">{entry.badge.icon}</span>
                    <p className="mt-0.5 text-[10px] font-semibold text-ink">{entry.badge.name}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {listings.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">Your marketplace listings</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {listings.map((listing) => (
                  <li key={listing.id}>
                    <Link href={`/marketplace/${listing.slug}`} className="text-ink hover:text-brand-800">
                      {listing.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <a
            href={`/players/${user.username}`}
            className="block rounded-2xl border border-line bg-surface-raised p-5 text-sm hover:border-brand-300"
          >
            <span className="font-semibold text-ink">View my public profile</span>
            <span className="mt-1 block text-ink-soft">See what other players can see</span>
          </a>
        </aside>
      </div>
    </Container>
  );
}