import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatDateShort, formatTimeRange } from "@/lib/dates";
import { cityLabel, formatPrice } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Pickleball events in Nepal",
  description:
    "Open play sessions, social nights, meetups, coaching sessions and demo days across Nepal. Attend an event or organise your own.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; past?: string }>;
}) {
  const viewer = await getCurrentUser();
  const { city, past } = await searchParams;
  const showPast = past === "1";

  const events = await prisma.event.findMany({
    where: {
      isCancelled: false,
      ...(city ? { city: city.toUpperCase() as never } : {}),
      ...(showPast ? {} : { startsAt: { gte: new Date() } }),
    },
    include: {
      organizer: { select: { fullName: true, username: true } },
      participants: viewer ? { where: { userId: viewer.id }, select: { id: true } } : false,
      _count: { select: { participants: true } },
    },
    orderBy: { startsAt: showPast ? "desc" : "asc" },
    take: 48,
  });

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Events"
        title={showPast ? "Past events" : "Upcoming events"}
        description="Open play, social nights, meetups and coaching sessions run by the community."
        action={
          viewer?.role === "ORGANIZER" || viewer?.role === "ADMIN" ? (
            <ButtonLink href="/organizer/events/new">Create an event</ButtonLink>
          ) : (
            <ButtonLink href="/events" variant="secondary">
              All events
            </ButtonLink>
          )
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={showPast ? "/events" : "/events?past=1"}
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
            !showPast ? "border-brand-600 bg-brand-600 text-white" : "border-line"
          }`}
        >
          Upcoming
        </Link>
        <Link
          href={showPast ? "/events?past=1" : "/events?past=1"}
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
            showPast ? "border-brand-600 bg-brand-600 text-white" : "border-line"
          }`}
        >
          Past
        </Link>
        {["KATHMANDU", "LALITPUR", "POKHARA", "BHAKTAPUR"].map((value) => (
          <Link
            key={value}
            href={`/events?city=${value.toLowerCase()}${showPast ? "&past=1" : ""}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
              city?.toUpperCase() === value
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-line text-ink-soft hover:bg-brand-50"
            }`}
          >
            {cityLabel(value)}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No events scheduled"
          description="Nothing is on the calendar right now. Check back soon, or organise something yourself."
          action={<ButtonLink href="/community">Visit the community</ButtonLink>}
          icon="📅"
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.slug}`}
                className="flex h-full flex-col rounded-2xl border border-line bg-surface-raised p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{event.type.replace(/_/g, " ")}</Badge>
                  <Badge tone={event.cost ? "warning" : "success"}>{formatPrice(event.cost)}</Badge>
                </div>
                <h2 className="mt-3 font-bold text-ink">{event.title}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatDateShort(event.startsAt)} · {formatTimeRange(event.startsAt, event.endsAt)}
                </p>
                <p className="text-sm text-ink-soft">
                  {event.venue} · {cityLabel(event.city)}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-sm">
                  <span className="text-ink-soft">
                    {event._count.participants}
                    {event.capacity ? ` / ${event.capacity}` : ""} going
                  </span>
                  {viewer && "participants" in event && Array.isArray(event.participants) && event.participants.length > 0 ? (
                    <Badge tone="success">Going</Badge>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}