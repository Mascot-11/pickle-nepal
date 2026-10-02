import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { track } from "@/lib/analytics";
import { formatDate, formatDateShort, formatTime } from "@/lib/dates";
import { cityLabel, formatPrice } from "@/lib/nepal";
import { Container } from "@/components/ui/container";
import { Avatar, Breadcrumbs, MetaList, ShareRow } from "@/components/ui/misc";
import { Badge, Card, StatTile, EmptyState } from "@/components/ui/primitives";
import { TournamentRegister } from "@/components/tournaments/register";
import { Bracket } from "@/components/tournaments/bracket";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { name: true, description: true, city: true, startsAt: true, posterUrl: true },
  });
  if (!tournament) return { title: "Tournament not found", robots: { index: false, follow: false } };

  const description =
    tournament.description?.slice(0, 160) ??
    `${tournament.name} — a pickleball tournament in ${cityLabel(tournament.city)}, Nepal.`;

  return {
    title: tournament.name,
    description,
    alternates: { canonical: `/tournaments/${slug}` },
    openGraph: {
      title: `${tournament.name} | PickleNepal`,
      description,
      images: tournament.posterUrl
        ? [{ url: tournament.posterUrl, width: 1200, height: 630, alt: tournament.name }]
        : undefined,
    },
  };
}

export default async function TournamentPage({ params }: { params: Params }) {
  const { slug } = await params;
  const viewer = await getCurrentUser();

  const tournament = await prisma.tournament.findFirst({
    where: { slug },
    include: {
      organizer: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      categories: {
        include: {
          _count: { select: { participants: true, matches: true } },
        },
      },
      teams: {
        include: {
          members: { include: { player: { select: { id: true, fullName: true, username: true } } } },
        },
      },
      matches: {
        include: {
          playerA: { select: { id: true, fullName: true, username: true } },
          playerB: { select: { id: true, fullName: true, username: true } },
          teamA: { include: { members: { include: { player: { select: { fullName: true } } } } } },
          teamB: { include: { members: { include: { player: { select: { fullName: true } } } } } },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
      _count: { select: { participants: true } },
    },
  });

  if (!tournament) notFound();

  void track({ name: "TOURNAMENT_VIEWED", userId: viewer?.id ?? null, entityType: "tournament", entityId: tournament.id });

  const registrations = viewer
    ? await prisma.tournamentParticipant.findMany({
        where: { tournamentId: tournament.id, userId: viewer.id },
        select: { categoryId: true, status: true },
      })
    : [];

  const registeredCategoryIds = new Set(registrations.map((r) => r.categoryId));

  const isOpen =
    ["REGISTRATION_OPEN", "UPCOMING"].includes(tournament.status) &&
    tournament.registrationDeadline > new Date();

  const canManage = viewer && (viewer.id === tournament.organizerId || viewer.role === "ADMIN");

  const partners = viewer
    ? await prisma.playerProfile.findMany({
        where: { user: { status: "ACTIVE" }, userId: { not: viewer.id } },
        select: { userId: true, user: { select: { fullName: true, username: true } } },
        take: 60,
      })
    : [];

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Tournaments", href: "/tournaments" }, { label: tournament.name }]} />

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{tournament.status.replace(/_/g, " ")}</Badge>
            <Badge tone={tournament.entryFee ? "warning" : "success"}>{formatPrice(tournament.entryFee)}</Badge>
            <Badge tone="neutral">{tournament.format.replace(/_/g, " ")}</Badge>
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{tournament.name}</h1>
          <p className="mt-2 text-ink-soft">
            {formatDate(tournament.startsAt)} – {formatDate(tournament.endsAt)} · {tournament.venue},{" "}
            {cityLabel(tournament.city)}
          </p>

          {tournament.description ? (
            <p className="mt-5 whitespace-pre-line text-ink">{tournament.description}</p>
          ) : null}

          <Card className="mt-6">
            <h2 className="font-semibold text-ink">Tournament details</h2>
            <div className="mt-4">
              <MetaList
                items={[
                  { label: "Organiser", value: tournament.organizer.fullName },
                  { label: "Registration closes", value: formatDateShort(tournament.registrationDeadline) },
                  { label: "Entry fee", value: formatPrice(tournament.entryFee) },
                  { label: "Format", value: tournament.format.replace(/_/g, " ") },
                  { label: "Max participants", value: tournament.maxParticipants ?? "Unlimited" },
                  { label: "Registered", value: tournament._count.participants },
                ]}
              />
            </div>

            {tournament.prizeInfo ? (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="text-sm font-semibold text-ink">Prizes</h3>
                <p className="mt-1 text-sm text-ink">{tournament.prizeInfo}</p>
              </div>
            ) : null}

            {tournament.contactInfo ? (
              <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">Contact: {tournament.contactInfo}</p>
            ) : null}
          </Card>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Categories</h2>
            <ul className="mt-3 space-y-2">
              {tournament.categories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3"
                >
                  <span>
                    <span className="font-semibold text-ink">{category.name}</span>
                    <span className="ml-2 text-xs text-ink-soft">{category.format}</span>
                  </span>
                  <span className="text-sm text-ink-soft">
                    {category._count.participants}
                    {category.maxEntries ? ` / ${category.maxEntries}` : ""} entries
                    {registeredCategoryIds.has(category.id) ? (
                      <Badge tone="success" className="ml-2">
                        Registered
                      </Badge>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {tournament.teams.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-ink">Teams</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {tournament.teams.map((team) => (
                  <li key={team.id} className="rounded-xl border border-line bg-surface-raised p-4 text-sm">
                    <p className="font-semibold text-ink">{team.name ?? "Team"}</p>
                    <ul className="mt-1 space-y-0.5 text-ink-soft">
                      {team.members.map((member) => (
                        <li key={member.id}>
                          <a href={`/players/${member.player.username}`} className="hover:text-brand-800 hover:underline">
                            {member.player.fullName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Bracket</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Horizontal on desktop, scrollable on mobile. Results advance automatically when a match is completed.
            </p>
            {tournament.matches.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No matches yet"
                  description="The organiser will publish the draw once registration closes."
                  icon="🎾"
                />
              </div>
            ) : (
              <div className="mt-4">
                <Bracket matches={tournament.matches} categories={tournament.categories.map((c) => ({ id: c.id, name: c.name }))} />
              </div>
            )}
          </section>

          <div className="mt-6">
            <ShareRow title={tournament.name} path={`/tournaments/${tournament.slug}`} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            {viewer?.id === tournament.organizerId || viewer?.role === "ADMIN" ? (
              <a
                href={`/organizer/tournaments/${tournament.id}/manage`}
                className="block rounded-full bg-brand-700 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-800"
              >
                Manage tournament
              </a>
            ) : isOpen ? (
              <TournamentRegister
                tournamentId={tournament.id}
                entryFee={tournament.entryFee}
                registrationDeadline={tournament.registrationDeadline}
                categories={tournament.categories.map((category) => ({
                  id: category.id,
                  name: category.name,
                  format: category.format,
                  maxEntries: category.maxEntries,
                  entries: category._count.participants,
                }))}
                registeredCategoryIds={[...registeredCategoryIds]}
                partners={partners.map((p) => ({ id: p.userId, name: p.user.fullName }))}
              />
            ) : (
              <p className="text-sm text-ink-soft">
                {tournament.registrationDeadline <= new Date()
                  ? "Registration has closed for this tournament."
                  : "Registration is not open right now."}
              </p>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Registered" value={tournament._count.participants} />
            <StatTile
              label="Categories"
              value={tournament.categories.length}
            />
          </div>

          <Card>
            <h2 className="text-sm font-semibold text-ink">Organiser</h2>
            <a href={`/players/${tournament.organizer.username}`} className="mt-2 flex items-center gap-3">
              <Avatar name={tournament.organizer.fullName} src={tournament.organizer.avatarUrl} size={36} />
              <span className="font-semibold text-ink">{tournament.organizer.fullName}</span>
            </a>
          </Card>

          {canManage ? null : null}
        </aside>
      </div>

      {tournament.rules ? (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-xl font-bold text-ink">Rules</h2>
          <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-line bg-surface-raised p-5 text-sm text-ink">
            {tournament.rules}
          </pre>
        </section>
      ) : null}

      <p className="mt-6 text-xs text-ink-soft">Times shown in Nepal local time ({formatTime(new Date())}).</p>
    </Container>
  );
}