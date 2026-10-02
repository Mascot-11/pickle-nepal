import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatDateShort } from "@/lib/dates";
import { cityLabel, formatPrice } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Pickleball tournaments in Nepal",
  description:
    "Find and enter pickleball tournaments in Kathmandu, Pokhara and across Nepal. Browse categories, read rules and register online.",
  alternates: { canonical: "/tournaments" },
};

const STATUS_TONES: Record<string, "brand" | "accent" | "success" | "neutral" | "warning"> = {
  DRAFT: "neutral",
  UPCOMING: "brand",
  REGISTRATION_OPEN: "success",
  REGISTRATION_CLOSED: "warning",
  LIVE: "accent",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; status?: string }>;
}) {
  const { city, status } = await searchParams;

  const tournaments = await prisma.tournament.findMany({
    where: {
      ...(city ? { city: city.toUpperCase() as never } : {}),
      ...(status ? { status: status.toUpperCase() as never } : {}),
    },
    include: {
      organizer: { select: { fullName: true, username: true } },
      categories: { select: { id: true, name: true, format: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 48,
  });

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Tournaments"
        title="Pickleball tournaments"
        description="Community and club tournaments across Nepal. Registration, categories and results all live here."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/tournaments" className={`chip ${!status ? "chip-active" : ""}`}>
          All
        </Link>
        {[
          { key: "REGISTRATION_OPEN", label: "Registration open" },
          { key: "UPCOMING", label: "Upcoming" },
          { key: "LIVE", label: "Live" },
          { key: "COMPLETED", label: "Completed" },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/tournaments?status=${tab.key}`}
            className={`chip ${status === tab.key ? "chip-active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          title="No tournaments listed"
          description="No tournaments match this filter yet. Check back soon or organise one."
          action={<ButtonLink href="/organizer/tournaments/create">Organise a tournament</ButtonLink>}
          icon="🏆"
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <li key={tournament.id}>
              <Link
                href={`/tournaments/${tournament.slug}`}
                className="flex h-full flex-col rounded-2xl border border-line bg-surface-raised p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONES[tournament.status] ?? "neutral"}>
                    {tournament.status.replace(/_/g, " ")}
                  </Badge>
                  <Badge tone={tournament.entryFee ? "warning" : "success"}>
                    {formatPrice(tournament.entryFee)}
                  </Badge>
                </div>
                <h2 className="mt-3 font-bold text-ink">{tournament.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatDateShort(tournament.startsAt)} – {formatDateShort(tournament.endsAt)}
                </p>
                <p className="text-sm text-ink-soft">
                  {tournament.venue} · {cityLabel(tournament.city)}
                </p>
                <p className="mt-2 line-clamp-1 text-sm text-ink-soft">
                  {tournament.categories.map((c) => c.name).join(" · ")}
                </p>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-sm">
                  <span className="text-ink-soft">{tournament._count.participants} registered</span>
                  <span className="text-ink-soft">by {tournament.organizer.fullName}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}