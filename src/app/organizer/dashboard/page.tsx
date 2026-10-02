import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container, SectionHeading } from "@/components/ui/container";
import { StatTile, EmptyState } from "@/components/ui/primitives";
import { formatDateShort } from "@/lib/dates";
import { cityLabel } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Organizer dashboard",
  robots: { index: false, follow: false },
};

export default async function OrganizerDashboardPage() {
  const user = await requireUser().catch(() => redirect("/login?next=/organizer/dashboard"));
  if (!["ORGANIZER", "ADMIN"].includes(user.role)) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Organiser access required"
          description="Only tournament organisers can manage tournaments."
          icon="🏆"
        />
      </Container>
    );
  }

  const tournaments = await prisma.tournament.findMany({
    where: { organizerId: user.id },
    include: {
      _count: { select: { participants: true, categories: true, matches: true } },
    },
    orderBy: { startsAt: "desc" },
    take: 40,
  });

  const totals = tournaments.reduce(
    (acc, t) => ({
      participants: acc.participants + t._count.participants,
      matches: acc.matches + t._count.matches,
    }),
    { participants: 0, matches: 0 },
  );

  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="Organizer"
        title="Your tournaments"
        description="Create tournaments, manage registrations and enter results."
        action={
          <Link
            href="/organizer/tournaments/create"
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Create tournament
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Tournaments" value={tournaments.length} />
        <StatTile label="Total registrations" value={totals.participants} />
        <StatTile label="Matches entered" value={totals.matches} />
      </div>

      {tournaments.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No tournaments yet"
            description="Create your first tournament and open registration."
            icon="🏆"
            action={
              <Link
                href="/organizer/tournaments/create"
                className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Create tournament
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {tournaments.map((tournament) => (
            <li key={tournament.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised p-5">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{tournament.name}</p>
                  <p className="text-sm text-ink-soft">
                    {formatDateShort(tournament.startsAt)} · {cityLabel(tournament.city)} ·{" "}
                    {tournament._count.participants} registered · {tournament._count.matches} matches
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/tournaments/${tournament.slug}`}
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-brand-50"
                  >
                    View
                  </Link>
                  <Link
                    href={`/organizer/tournaments/${tournament.id}/manage`}
                    className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}