import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/permissions";
import { AdminDirectory } from "@/components/admin/directory";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin · Tournaments",
  robots: { index: false, follow: false },
};

export default async function AdminTournamentsPage() {
  requireAdmin().catch(() => redirect("/login?next=/admin/tournaments"));

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminDirectory
      title="Tournaments"
      rows={tournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        meta: `${tournament.city.replace(/_/g, " ")} · ${tournament.format.replace(/_/g, " ")}`,
        status: tournament.status.replace(/_/g, " "),
        href: `/tournaments/${tournament.slug}`,
        createdAt: tournament.createdAt,
      }))}
    />
  );
}
