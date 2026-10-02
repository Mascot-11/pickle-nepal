import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { allFeatureFlags } from "@/lib/feature-flags";
import { Container } from "@/components/ui/container";
import { StatTile } from "@/components/ui/primitives";
import { AdminNav } from "@/components/admin/nav";
import { toNepalParts } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOverviewPage() {
  const admin = await requireAdmin().catch(() => redirect("/login?next=/admin"));
  void admin;

  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 86400_000);
  const since30 = new Date(now.getTime() - 30 * 86400_000);

  const [
    totalUsers,
    newUsers,
    activeUsers,
    players,
    clubs,
    courts,
    games,
    events,
    tournaments,
    posts,
    openReports,
    revenue,
    gamesByCity,
    flags,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: since7 } } }),
    prisma.playerProfile.count(),
    prisma.club.count({ where: { deletedAt: null } }),
    prisma.court.count({ where: { isActive: true, deletedAt: null } }),
    prisma.game.count(),
    prisma.event.count(),
    prisma.tournament.count(),
    prisma.communityPost.count({ where: { isHidden: false, deletedAt: null } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    prisma.game.groupBy({ by: ["city"], _count: { _all: true }, orderBy: { _count: { city: "desc" } } }),
    allFeatureFlags(),
  ]);

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Admin overview</h1>
      <p className="mt-1 text-ink-soft">
        Platform health as of {toNepalParts(now).date} (Nepal time). Every moderation action
        is written to the audit log.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />

        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Total users" value={totalUsers} />
            <StatTile label="New (30d)" value={newUsers} />
            <StatTile label="Active (7d)" value={activeUsers} />
            <StatTile label="Players" value={players} />
            <StatTile label="Open reports" value={openReports} />
            <StatTile label="Clubs" value={clubs} />
            <StatTile label="Courts" value={courts} />
            <StatTile label="Games" value={games} />
            <StatTile label="Events" value={events} />
            <StatTile label="Tournaments" value={tournaments} />
            <StatTile label="Posts" value={posts} />
            <StatTile label="Revenue" value={`NPR ${revenue._sum.amount ?? 0}`} />
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Games by city</h2>
            <ul className="mt-3 space-y-2">
              {gamesByCity.map((row) => (
                <li key={row.city} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm">
                  <span className="font-medium text-ink">{row.city.replace(/_/g, " ")}</span>
                  <span className="text-ink-soft">{row._count._all} games</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Feature flags</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(flags).map(([key, enabled]) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm"
                >
                  <span className="font-medium text-ink">{key}</span>
                  <span className={enabled ? "text-brand-700" : "text-ink-soft"}>
                    {enabled ? "Enabled" : "Disabled"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Container>
  );
}