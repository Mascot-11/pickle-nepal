import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/permissions";
import { AdminDirectory } from "@/components/admin/directory";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin · Courts",
  robots: { index: false, follow: false },
};

export default async function AdminCourtsPage() {
  requireAdmin().catch(() => redirect("/login?next=/admin/courts"));

  const courts = await prisma.court.findMany({
    where: { deletedAt: null },
    include: { club: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminDirectory
      title="Courts"
      rows={courts.map((court) => ({
        id: court.id,
        name: court.name,
        meta: `${court.indoorOutdoor} · ${court.club?.name ?? "Independent"}`,
        status: court.isActive ? "Active" : "Inactive",
        href: `/courts/${court.slug}`,
        createdAt: court.createdAt,
      }))}
    />
  );
}
