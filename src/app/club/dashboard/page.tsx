import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClubManager } from "@/lib/auth/permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { Container, SectionHeading } from "@/components/ui/container";
import { StatTile, EmptyState, Badge, Card } from "@/components/ui/primitives";
import { formatDateShort, relativeDayLabel } from "@/lib/dates";
import { formatPrice } from "@/lib/nepal";
import { updateBookingStatusAction } from "@/lib/bookings/actions";

export const metadata: Metadata = {
  title: "Club dashboard",
  robots: { index: false, follow: false },
};

export default async function ClubDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const { club: clubId } = await searchParams;

  const managedClubs = await prisma.club.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true, isVerified: true, ownerId: true },
    orderBy: { name: "asc" },
  });

  if (managedClubs.length === 0) {
    return (
      <Container className="py-16">
        <EmptyState
          title="No clubs to manage"
          description="You need to own a club or be an admin of one to use the club dashboard."
          icon="🏢"
          action={
            <Link href="/clubs" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              Browse clubs
            </Link>
          }
        />
      </Container>
    );
  }

  const targetId = clubId ?? managedClubs[0].id;
  // Authorisation: throws unless the user manages this club.
  await requireClubManager(targetId).catch(() => redirect("/clubs"));

  const bookingsEnabled = await isFeatureEnabled("BOOKINGS");

  const club = await prisma.club.findUnique({
    where: { id: targetId },
    include: {
      courts: {
        include: {
          _count: { select: { games: true, bookings: true } },
          bookings: {
            where: { bookingDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            orderBy: { startsAt: "asc" },
            take: 20,
            include: { user: { select: { fullName: true, username: true } } },
          },
        },
      },
      games: {
        where: { startsAt: { gte: new Date() } },
        include: {
          creator: { select: { fullName: true, username: true } },
          _count: { select: { participants: true } },
          court: { select: { name: true } },
        },
        orderBy: { startsAt: "asc" },
        take: 20,
      },
      events: { orderBy: { startsAt: "asc" }, take: 20 },
      announcements: { orderBy: { createdAt: "desc" }, take: 10 },
      coaches: { include: { user: { select: { fullName: true, username: true } } } },
      members: { include: { user: { select: { fullName: true, username: true, avatarUrl: true } } } },
      _count: { select: { courts: true, members: true } },
    },
  });

  if (!club) redirect("/clubs");

  const profileViews = club.profileViews;
  const pendingBookings = club.courts.flatMap((c) => c.bookings).filter((b) => b.status === "PENDING");
  const upcomingGames = club.games.length;
  const eventCount = club.events.length;

  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="Club dashboard"
        title={club.name}
        description="Manage courts, games, events, coaches and bookings."
        action={
          <Link
            href={`/clubs/${club.slug}`}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:bg-brand-50"
          >
            View public page
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {managedClubs.map((entry) => (
          <Link
            key={entry.id}
            href={`/club/dashboard?club=${entry.id}`}
            className={`chip ${entry.id === targetId ? "chip-active" : ""}`}
          >
            {entry.name}
            {entry.isVerified ? " ✓" : ""}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Profile views" value={profileViews} />
        <StatTile label="Courts" value={club._count.courts} />
        <StatTile label="Members" value={club._count.members} />
        <StatTile label="Upcoming games" value={upcomingGames} />
        <StatTile label="Pending bookings" value={pendingBookings.length} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold text-ink">Courts</h2>
          <ul className="mt-4 space-y-2">
            {club.courts.map((court) => (
              <li key={court.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 font-semibold text-ink">
                        <Link href={`/courts/${court.slug}`} className="hover:text-brand-800">
                          {court.name}
                        </Link>
                        <Badge tone={court.isActive ? "success" : "warning"}>
                          {court.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </p>
                      <p className="text-xs text-ink-soft">
                        {court.indoorOutdoor} · {court.pricePerHour ? `${formatPrice(court.pricePerHour)}/hr` : "No pricing"} ·{" "}
                        {court._count.games} games · {court._count.bookings} bookings
                      </p>
                    </div>
                    <a
                      href={`/courts/${court.slug}`}
                      className="text-sm font-semibold text-brand-700 hover:underline"
                    >
                      Open
                    </a>
                  </div>

                  {bookingsEnabled && court.bookings.length > 0 ? (
                    <ul className="mt-3 space-y-2 border-t border-line pt-3">
                      {court.bookings.map((booking) => (
                        <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span>
                            <span className="font-medium text-ink">{booking.user.fullName}</span>{" "}
                            <span className="text-ink-soft">
                              {formatDateShort(booking.bookingDate)} · {booking.status}
                            </span>
                          </span>
                          {booking.status === "PENDING" ? (
                            <span className="flex gap-2">
                              <BookingButton bookingId={booking.id} status="CONFIRMED" />
                              <BookingButton bookingId={booking.id} status="CANCELLED" danger />
                            </span>
                          ) : (
                            <BookingButton bookingId={booking.id} status="COMPLETED" />
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
          {!bookingsEnabled ? (
            <p className="mt-2 text-xs text-ink-soft">
              Online bookings are behind the BOOKINGS feature flag, currently off.
            </p>
          ) : null}
        </section>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-bold text-ink">Games</h2>
            {club.games.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No upcoming games" description="Publish a game from the games page." icon="🏓" />
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {club.games.map((game) => (
                  <li key={game.id}>
                    <Link
                      href={`/games/${game.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm hover:border-brand-300"
                    >
                      <span className="truncate font-medium text-ink">{game.title ?? game.court.name}</span>
                      <span className="shrink-0 text-ink-soft">
                        {relativeDayLabel(game.startsAt)} · {game._count.participants} joined · by{" "}
                        {game.creator.fullName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink">Events</h2>
            {club.events.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No events scheduled.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {club.events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.slug}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm hover:border-brand-300"
                    >
                      <span className="truncate font-medium text-ink">{event.title}</span>
                      <span className="shrink-0 text-ink-soft">{formatDateShort(event.startsAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-soft">
              Events scheduled: {eventCount}.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink">Coaches & staff</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {club.coaches.map((coach) => (
                <li key={coach.id} className="flex items-center justify-between gap-2">
                  <Link href={`/coaches/${coach.slug}`} className="text-ink hover:text-brand-800">
                    {coach.user.fullName}
                  </Link>
                  {coach.isVerified ? <Badge tone="success">Verified</Badge> : null}
                </li>
              ))}
              {club.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2 text-ink-soft">
                  <span>{member.user.fullName}</span>
                  <Badge tone="neutral">{member.role}</Badge>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink">Announcements</h2>
            {club.announcements.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No announcements yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {club.announcements.map((announcement) => (
                  <li key={announcement.id} className="rounded-xl border border-line bg-surface-raised p-4">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      {announcement.title}
                      {announcement.pinned ? <Badge tone="accent">Pinned</Badge> : null}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{announcement.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Container>
  );
}

function BookingButton({
  bookingId,
  status,
  danger,
}: {
  bookingId: string;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED";
  danger?: boolean;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await updateBookingStatusAction(bookingId, status);
      }}
    >
      <button
        type="submit"
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          danger ? "border border-red-200 text-red-600 hover:bg-red-50" : "border border-line hover:bg-brand-50"
        }`}
      >
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </button>
    </form>
  );
}