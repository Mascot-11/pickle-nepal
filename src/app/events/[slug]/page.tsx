import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { track } from "@/lib/analytics";
import { formatDate, formatTimeRange } from "@/lib/dates";
import { cityLabel, formatPrice } from "@/lib/nepal";
import { Container } from "@/components/ui/container";
import { Avatar, Breadcrumbs, MetaList, ShareRow } from "@/components/ui/misc";
import { Badge, Card, StatTile } from "@/components/ui/primitives";
import { EventAttendButton } from "@/components/events/attend-button";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { title: true, description: true, city: true, startsAt: true, imageUrl: true, type: true },
  });
  if (!event) return { title: "Event not found", robots: { index: false, follow: false } };

  const description =
    event.description?.slice(0, 160) ??
    `${event.title} — a ${event.type.replace(/_/g, " ").toLowerCase()} event in ${cityLabel(event.city)}, Nepal.`;

  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${slug}` },
    openGraph: {
      title: `${event.title} | PickleNepal`,
      description,
      images: event.imageUrl ? [{ url: event.imageUrl, width: 1200, height: 630, alt: event.title }] : undefined,
    },
  };
}

export default async function EventPage({ params }: { params: Params }) {
  const { slug } = await params;
  const viewer = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organizer: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      court: { select: { name: true, slug: true } },
      club: { select: { name: true, slug: true, isVerified: true } },
      participants: {
        include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!event) notFound();

  void track({ name: "TOURNAMENT_VIEWED", userId: viewer?.id ?? null, entityType: "event", entityId: event.id });

  const isAttending = viewer ? event.participants.some((p) => p.userId === viewer.id) : false;
  const isPast = event.startsAt <= new Date();

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Events", href: "/events" }, { label: event.title }]} />

      {event.isCancelled ? (
        <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          This event has been cancelled by the organiser.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{event.type.replace(/_/g, " ")}</Badge>
            <Badge tone={event.cost ? "warning" : "success"}>{formatPrice(event.cost)}</Badge>
            {event.club ? (
              <Badge tone={event.club.isVerified ? "success" : "neutral"}>{event.club.name}</Badge>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{event.title}</h1>
          <p className="mt-2 text-ink-soft">
            {formatDate(event.startsAt)} · {formatTimeRange(event.startsAt, event.endsAt)}
          </p>

          {event.description ? (
            <p className="mt-5 whitespace-pre-line text-ink">{event.description}</p>
          ) : null}

          <Card className="mt-6">
            <h2 className="font-semibold text-ink">Details</h2>
            <div className="mt-4">
              <MetaList
                items={[
                  { label: "Venue", value: event.venue },
                  { label: "City", value: cityLabel(event.city) },
                  { label: "Court", value: event.court ? event.court.name : "TBC" },
                  { label: "Capacity", value: event.capacity ?? "Unlimited" },
                  { label: "Cost", value: formatPrice(event.cost) },
                  { label: "Type", value: event.type.replace(/_/g, " ") },
                ]}
              />
            </div>
          </Card>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">
              Who is going ({event.participants.length}
              {event.capacity ? ` / ${event.capacity}` : ""})
            </h2>
            {event.participants.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-surface-raised px-4 py-6 text-center text-sm text-ink-soft">
                Nobody has signed up yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {event.participants.slice(0, 24).map((participant) => (
                  <li
                    key={participant.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-3"
                  >
                    <Avatar name={participant.user.fullName} src={participant.user.avatarUrl} size={32} />
                    <a
                      href={`/players/${participant.user.username}`}
                      className="truncate text-sm font-medium text-ink hover:text-brand-800"
                    >
                      {participant.user.fullName}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Organiser</h2>
            <a
              href={`/players/${event.organizer.username}`}
              className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-4 hover:border-brand-300"
            >
              <Avatar name={event.organizer.fullName} src={event.organizer.avatarUrl} size={44} />
              <div>
                <p className="font-semibold text-ink">{event.organizer.fullName}</p>
                <p className="text-xs text-ink-soft">@{event.organizer.username}</p>
              </div>
            </a>
          </section>

          <div className="mt-6">
            <ShareRow title={event.title} path={`/events/${event.slug}`} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            {isPast ? (
              <p className="text-sm text-ink-soft">This event has already taken place.</p>
            ) : (
              <EventAttendButton
                eventId={event.id}
                isAttending={isAttending}
                isSignedIn={!!viewer}
                isCancelled={event.isCancelled}
                isFull={!!event.capacity && event.participants.length >= event.capacity}
              />
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Going" value={event.participants.length} />
            <StatTile label="Spots left" value={event.capacity ? event.capacity - event.participants.length : "∞"} />
          </div>

          {event.latitude && event.longitude ? (
            <Card>
              <h2 className="text-sm font-semibold text-ink">Location</h2>
              <a
                href={`https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                Open in maps ↗
              </a>
            </Card>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}