import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { track } from "@/lib/analytics";
import { cityLabel } from "@/lib/nepal";
import { formatDateShort } from "@/lib/dates";
import { Container } from "@/components/ui/container";
import { Avatar, Breadcrumbs, MetaList, ShareRow } from "@/components/ui/misc";
import { Badge, Card, EmptyState, StatTile } from "@/components/ui/primitives";
import { CourtCard } from "@/components/courts/court-card";
import { GameCard } from "@/components/games/game-card";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const club = await prisma.club.findUnique({
    where: { slug },
    select: { name: true, description: true, city: true, logoUrl: true },
  });
  if (!club) return { title: "Club not found", robots: { index: false, follow: false } };

  const description =
    club.description?.slice(0, 160) ??
    `${club.name} is a pickleball club in ${cityLabel(club.city)}, Nepal. Courts, coaching, games and events.`;

  return {
    title: `${club.name} — pickleball club in ${cityLabel(club.city)}`,
    description,
    alternates: { canonical: `/clubs/${slug}` },
    openGraph: {
      title: `${club.name} | PickleNepal`,
      description,
      images: club.logoUrl ? [{ url: club.logoUrl, width: 400, height: 400, alt: club.name }] : undefined,
    },
  };
}

export default async function ClubPage({ params }: { params: Params }) {
  const { slug } = await params;

  const club = await prisma.club.findFirst({
    where: { slug, deletedAt: null },
    include: {
      courts: { where: { isActive: true, deletedAt: null }, select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true, pricePerHour: true } },
      events: {
        where: { startsAt: { gte: new Date() }, isCancelled: false },
        select: { id: true, slug: true, title: true, startsAt: true, city: true, type: true },
        orderBy: { startsAt: "asc" },
        take: 5,
      },
      games: {
        where: { status: { in: ["OPEN", "FULL"] }, startsAt: { gte: new Date() } },
        include: {
          court: { select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true } },
          creator: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
          _count: { select: { participants: true, waitlist: true } },
        },
        orderBy: { startsAt: "asc" },
        take: 6,
      },
      coaches: {
        include: { user: { select: { fullName: true, username: true, avatarUrl: true } } },
        take: 6,
      },
      announcements: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 5 },
      members: {
        include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
        take: 12,
      },
      owner: { select: { fullName: true, username: true } },
      _count: { select: { courts: true, games: true, events: true, members: true } },
    },
  });

  if (!club) notFound();

  void track({ name: "CLUB_VIEWED", entityType: "club", entityId: club.id });

  const reviews = await prisma.review.findMany({
    where: { subjectType: "CLUB", status: "VISIBLE", clubId: club.id },
    include: { reviewer: { select: { fullName: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  await prisma.club.update({ where: { id: club.id }, data: { profileViews: { increment: 1 } } });

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Clubs", href: "/clubs" }, { label: club.name }]} />

      <Card className="overflow-hidden p-0">
        <div className="h-32 bg-gradient-to-r from-brand-700 to-accent-500 sm:h-40" aria-hidden="true" />
        <div className="px-5 pb-5">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <Avatar name={club.name} src={club.logoUrl} size={88} className="ring-4 ring-surface-raised" />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-ink">
                {club.name}
                {club.isVerified ? (
                  <span title="Verified club" aria-label="Verified club" className="text-brand-700">
                    ✓ Verified
                  </span>
                ) : null}
              </h1>
              <p className="text-sm text-ink-soft">
                {cityLabel(club.city)}
                {club.address ? ` · ${club.address}` : ""}
              </p>
            </div>
          </div>

          {club.description ? <p className="mt-4 text-ink">{club.description}</p> : null}

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Courts" value={club._count.courts} />
            <StatTile label="Upcoming games" value={club._count.games} />
            <StatTile label="Events" value={club._count.events} />
            <StatTile label="Members" value={club._count.members} />
          </dl>
        </div>
      </Card>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-ink">Courts</h2>
            {club.courts.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No public courts" description="This club has not listed its courts yet." icon="📍" />
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {club.courts.map((court) => (
                  <CourtCard key={court.id} court={court} />
                ))}
              </div>
            )}
          </section>

          {club.games.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Club games</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {club.games.map((game) => (
                  <GameCard key={game.id} game={game as never} now={new Date()} />
                ))}
              </div>
            </section>
          ) : null}

          {club.events.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Upcoming events</h2>
              <ul className="mt-4 space-y-2">
                {club.events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm hover:border-brand-300"
                    >
                      <span className="truncate font-medium text-ink">{event.title}</span>
                      <span className="shrink-0 text-ink-soft">{formatDateShort(event.startsAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {club.announcements.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Announcements</h2>
              <ul className="mt-4 space-y-3">
                {club.announcements.map((announcement) => (
                  <li key={announcement.id} className="rounded-xl border border-line bg-surface-raised p-4">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      {announcement.title}
                      {announcement.pinned ? <Badge tone="accent">Pinned</Badge> : null}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{announcement.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-xl font-bold text-ink">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-line bg-surface-raised px-4 py-8 text-center text-sm text-ink-soft">
                No club reviews yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {reviews.map((review) => (
                  <li key={review.id} className="rounded-xl border border-line bg-surface-raised p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={review.reviewer.fullName} src={review.reviewer.avatarUrl} size={32} />
                      <a href={`/players/${review.reviewer.username}`} className="text-sm font-semibold text-ink hover:text-brand-800">
                        {review.reviewer.fullName}
                      </a>
                      <span className="ml-auto text-sm font-bold text-accent-700">
                        {"★".repeat(review.rating)}
                        <span className="text-line">{"★".repeat(5 - review.rating)}</span>
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink">{review.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="font-semibold text-ink">Club details</h2>
            <div className="mt-3">
              <MetaList
                items={[
                  { label: "City", value: cityLabel(club.city) },
                  { label: "Courts", value: club._count.courts },
                  { label: "Members", value: club._count.members },
                  { label: "Managed by", value: club.owner.fullName },
                ]}
              />
            </div>
            {(club.phone || club.email || club.website) && (
              <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
                {club.phone ? <a href={`tel:${club.phone}`} className="text-brand-700 hover:underline">📞 {club.phone}</a> : null}
                {club.email ? <a href={`mailto:${club.email}`} className="text-brand-700 hover:underline">✉️ Email</a> : null}
                {club.website ? <a href={club.website} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">🌐 Website</a> : null}
              </div>
            )}
            {club.membershipInfo ? (
              <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">{club.membershipInfo}</p>
            ) : null}
            {club.openingHours ? (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="text-sm font-semibold text-ink">Opening hours</h3>
                <dl className="mt-2 space-y-0.5 text-sm">
                  {Object.entries(club.openingHours as Record<string, string>).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <dt className="capitalize text-ink-soft">{day}</dt>
                      <dd className="font-medium text-ink">{hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </Card>

          {club.coaches.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">Coaches</h2>
              <ul className="mt-3 space-y-2">
                {club.coaches.map((coach) => (
                  <li key={coach.id}>
                    <a href={`/coaches/${coach.slug}`} className="flex items-center gap-2 text-sm hover:text-brand-800">
                      <Avatar name={coach.user.fullName} src={coach.photoUrl ?? coach.user.avatarUrl} size={28} />
                      <span className="font-medium text-ink">{coach.user.fullName}</span>
                      {coach.isVerified ? <span title="Verified coach">✓</span> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {club.members.length > 0 ? (
            <Card>
              <h2 className="font-semibold text-ink">People at this club</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {club.members.map((member) => (
                  <a key={member.id} href={`/players/${member.user.username}`} title={member.user.fullName}>
                    <Avatar name={member.user.fullName} src={member.user.avatarUrl} size={32} />
                  </a>
                ))}
              </div>
            </Card>
          ) : null}

          <ShareRow title={club.name} path={`/clubs/${club.slug}`} />
        </aside>
      </div>

      <p className="mt-8 text-xs text-ink-soft">
        Court pricing on club pages is indicative. Confirm fees and court availability with the club
        before travelling.
      </p>
    </Container>
  );
}