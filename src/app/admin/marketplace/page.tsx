import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/permissions";
import { AdminDirectory } from "@/components/admin/directory";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Admin · Marketplace",
  robots: { index: false, follow: false },
};

export default async function AdminMarketplacePage() {
  requireAdmin().catch(() => redirect("/login?next=/admin/marketplace"));

  const listings = await prisma.marketplaceListing.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminDirectory
      title="Marketplace listings"
      rows={listings.map((listing) => ({
        id: listing.id,
        name: listing.title,
        meta: `${listing.city.replace(/_/g, " ")} · ${formatPrice(listing.price)} · ${listing.condition.replace(/_/g, " ")}`,
        status: listing.status,
        href: `/marketplace/${listing.slug}`,
        createdAt: listing.createdAt,
      }))}
    />
  );
}
