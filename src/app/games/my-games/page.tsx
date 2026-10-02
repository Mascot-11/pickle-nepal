import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listViewerGames } from "@/lib/games/queries";
import { prisma } from "@/lib/db";
import { Container, SectionHeading } from "@/components/ui/container";
import { EmptyState, Badge } from "@/components/ui/primitives";
import { GameCard } from "@/components/games/game-card";
import { relativeDayLabel } from "@/lib/dates";

export const metadata: Metadata = {
  title: "My games",
  robots: { index: false, follow: false },
};

export default async function MyGamesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/games/my-games");

  const [{ joined, created }, waitlisted] = await Promise.all([
    listViewerGames(user.id),
    prisma.gameWaitlist.findMany({
      where: { userId: user.id, status: { in: ["WAITING", "OFFERED"] } },
      include: {
        game: {
          include: {
            court: { select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true } },
            creator: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
            _count: { select: { participants: true, waitlist: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 10,
    }),
  ]);

  const upcoming = joined.filter((g) => g.startsAt >= new Date());

  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="My games"
        title="Games you joined and created"
        description={`${upcoming.length} upcoming · ${created.length} created`}
        action={
          <Link href="/games/create" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
            Create a Game
          </Link>
        }
      />

      {waitlisted.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-ink">Waitlisted</h2>
          <ul className="mt-3 space-y-2">
            {waitlisted.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/games/${entry.game.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm hover:border-brand-300"
                >
                  <span className="truncate font-medium text-ink">
                    {entry.game.title ?? entry.game.court.name}
                  </span>
                  <span className="flex items-center gap-2 text-ink-soft">
                    {relativeDayLabel(entry.game.startsAt)}
                    <Badge tone={entry.status === "OFFERED" ? "success" : "neutral"}>
                      {entry.status === "OFFERED" ? "Spot offered" : `#${entry.position}`}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-xl font-bold text-ink">Joined</h2>
        {joined.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="You have not joined any games yet"
              description="Find an open game near you and join it."
              action={<Link href="/games" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">Find a game</Link>}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {joined.map((game) => (
              <GameCard key={game.id} game={game} now={new Date()} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">Created</h2>
        {created.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="You have not created a game yet" description="Hosting is the fastest way to build a regular group." icon="📣" />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {created.map((game) => (
              <GameCard key={game.id} game={game} now={new Date()} />
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}