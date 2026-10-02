import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireTournamentOrganizer } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/misc";
import { Badge, Card, StatTile, EmptyState } from "@/components/ui/primitives";
import { formatDate, formatTime } from "@/lib/dates";
import { OrganizerControls } from "@/components/tournaments/organizer-controls";
import { MatchResultForm } from "@/components/tournaments/match-result-form";

export const metadata: Metadata = {
  title: "Manage tournament",
  robots: { index: false, follow: false },
};

export default async function ManageTournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  await requireTournamentOrganizer(id).catch(() => redirect("/login?next=/organizer"));

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          participants: { include: { user: { select: { id: true, fullName: true, username: true } } } },
          teams: { include: { members: { include: { player: { select: { fullName: true } } } } } },
          matches: {
            include: {
              playerA: { select: { fullName: true } },
              playerB: { select: { fullName: true } },
              teamA: { include: { members: { include: { player: { select: { fullName: true } } } } } },
              teamB: { include: { members: { include: { player: { select: { fullName: true } } } } } },
            },
            orderBy: [{ round: "asc" }, { position: "asc" }],
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  const matches = tournament.categories.flatMap((c) => c.matches);

  return (
    <Container className="py-8">
      <Breadcrumbs
        items={[
          { label: "Organizer", href: "/organizer/dashboard" },
          { label: tournament.name },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{tournament.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-ink-soft">
            <Badge tone="brand">{tournament.status.replace(/_/g, " ")}</Badge>
            {formatDate(tournament.startsAt)} – {formatDate(tournament.endsAt)}
          </p>
        </div>
        <OrganizerControls
          tournamentId={tournament.id}
          status={tournament.status}
          hasBracket={matches.length > 0}
        />
      </div>

      {created === "1" ? (
        <p className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
          Tournament created as a draft. Open registration when your categories and fees are ready.
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <StatTile label="Categories" value={tournament.categories.length} />
        <StatTile label="Registrations" value={tournament.categories.reduce((sum, c) => sum + c.participants.length, 0)} />
        <StatTile label="Matches" value={matches.length} />
        <StatTile label="Entry fee" value={`NPR ${tournament.entryFee}`} />
      </div>

      <div className="mt-10 space-y-10">
        {tournament.categories.map((category) => (
          <section key={category.id}>
            <h2 className="text-xl font-bold text-ink">
              {category.name} <span className="text-sm font-normal text-ink-soft">({category.format})</span>
            </h2>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card>
                <h3 className="text-sm font-semibold text-ink">
                  Registrations ({category.participants.length})
                </h3>
                {category.participants.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">No registrations yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {category.participants.map((participant) => (
                      <li key={participant.id} className="flex items-center justify-between gap-2">
                        <span>{participant.user.fullName}</span>
                        <Badge tone="neutral">{participant.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {category.teams.length > 0 ? (
                  <>
                    <h4 className="mt-4 text-sm font-semibold text-ink">Teams</h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      {category.teams.map((team) => (
                        <li key={team.id}>
                          {team.name ?? "Team"}: {team.members.map((m) => m.player.fullName).join(" / ")}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-ink">Matches ({category.matches.length})</h3>
                {category.matches.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">
                    No bracket yet. Generate one once enough players have registered.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {category.matches.map((match) => {
                      const labelA =
                        match.teamA?.name ??
                        match.teamA?.members.map((m) => m.player.fullName).join(" / ") ??
                        match.playerA?.fullName ??
                        "TBD";
                      const labelB =
                        match.teamB?.name ??
                        match.teamB?.members.map((m) => m.player.fullName).join(" / ") ??
                        match.playerB?.fullName ??
                        "TBD";
                      return (
                        <li key={match.id} className="rounded-xl border border-line p-3 text-sm">
                          <p className="flex items-center justify-between text-xs text-ink-soft">
                            <span>
                              Round {match.round} · Match {match.position}
                            </span>
                            {match.status === "COMPLETED" ? (
                              <Badge tone="success">Completed</Badge>
                            ) : (
                              <Badge tone="neutral">Scheduled</Badge>
                            )}
                          </p>
                          <p className="mt-1 flex items-center justify-between gap-2">
                            <span className="truncate text-ink">{labelA}</span>
                            <span className="font-bold text-ink">{match.scoreA ?? "–"}</span>
                          </p>
                          <p className="flex items-center justify-between gap-2">
                            <span className="truncate text-ink">{labelB}</span>
                            <span className="font-bold text-ink">{match.scoreB ?? "–"}</span>
                          </p>
                          {match.status === "COMPLETED" ? (
                            <p className="mt-1 text-xs text-ink-soft">
                              Completed results are immutable. Contact an admin to correct one.
                            </p>
                          ) : (
                            <div className="mt-2">
                              <MatchResultForm matchId={match.id} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </section>
        ))}

        {tournament.categories.length === 0 ? (
          <EmptyState title="No categories" description="Add at least one category to open registration." icon="🏆" />
        ) : null}
      </div>

      <p className="mt-8 text-xs text-ink-soft">
        All times are Nepal local time. Last opened {formatTime(new Date())}.
      </p>
    </Container>
  );
}