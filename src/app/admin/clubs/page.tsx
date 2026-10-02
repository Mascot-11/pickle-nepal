import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/nav";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { formatDateShort, relativeDayLabel } from "@/lib/dates";
import { formatPrice, cityLabel } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Admin · Directory",
  robots: { index: false, follow: false },
};

export default async function AdminClubsPage() {
  requireAdmin().catch(() => redirect("/login?next=/admin/clubs"));

  const [clubs, courts] = await Promise.all([
    prisma.club.findMany({
      where: { deletedAt: null },
      include: { owner: { select: { fullName: true, email: true } }, _count: { select: { courts: true, members: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.court.findMany({
      where: { deletedAt: null },
      include: { club: { select: { name: true } }, _count: { select: { games: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Directory management</h1>
      <p className="mt-1 text-ink-soft">Clubs and courts are created by their owners and verified through the verification queue.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-bold text-ink">Clubs ({clubs.length})</h2>
            {clubs.length === 0 ? (
              <div className="mt-4"><EmptyState title="No clubs" description="No clubs registered." icon="🏢" /></div>
            ) : (
              <ul className="mt-4 space-y-2">
                {clubs.map((club) => (
                  <li key={club.id}>
                    <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                          {club.name}
                          {club.isVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="neutral">Unverified</Badge>}
                        </p>
                        <p className="truncate text-xs text-ink-soft">
                          {cityLabel(club.city)} · {club._count.courts} courts · {club._count.members} members · owner{" "}
                          {club.owner.fullName} ({club.owner.email})
                        </p>
                      </div>
                      <span className="text-xs text-ink-soft">{formatDateShort(club.createdAt)}</span>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink">Courts ({courts.length})</h2>
            <ul className="mt-4 space-y-2">
              {courts.map((court) => (
                <li key={court.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {court.name}
                        <Badge tone={court.isActive ? "success" : "warning"}>{court.isActive ? "Active" : "Inactive"}</Badge>
                        <Badge tone="neutral">{court.indoorOutdoor}</Badge>
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {cityLabel(court.city)} · {court.club?.name ?? "Independent"} ·{" "}
                        {court.pricePerHour ? `${formatPrice(court.pricePerHour)}/hr` : "No pricing"} ·{" "}
                        {court._count.games} games
                      </p>
                    </div>
                    <span className="text-xs text-ink-soft">{relativeDayLabel(court.createdAt)}</span>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Container>
  );
}