import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { LISTING_CATEGORIES, CITIES, cityLabel, formatPrice } from "@/lib/nepal";
import { relativeDayLabel } from "@/lib/dates";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/smart-image";
import { ListingComposer } from "@/components/marketplace/composer";

export const metadata: Metadata = {
  title: "Pickleball gear marketplace in Nepal",
  description:
    "Buy and sell pickleball paddles, balls, shoes, bags and court equipment from players and sellers across Nepal.",
  alternates: { canonical: "/marketplace" },
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; q?: string }>;
}) {
  const viewer = await getCurrentUser();
  const enabled = await isFeatureEnabled("MARKETPLACE");
  const { category, city, q } = await searchParams;

  if (!enabled) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Marketplace is not available"
          description="The marketplace has not been enabled on this deployment yet."
          action={<ButtonLink href="/">Back to home</ButtonLink>}
          icon="🛒"
        />
      </Container>
    );
  }

  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      ...(category ? { category: category.toUpperCase() as never } : {}),
      ...(city ? { city: city.toUpperCase() as never } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: {
      seller: { select: { id: true, fullName: true, username: true, avatarUrl: true, sellerProfile: { select: { businessName: true, isVerified: true } } } },
      _count: { select: { favorites: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Marketplace"
        title="Gear marketplace"
        description="Classified listings from players and sellers. Meet locally, inspect before you pay."
        action={viewer ? <ButtonLink href="/marketplace/new">Sell something</ButtonLink> : <ButtonLink href="/register">Join to sell</ButtonLink>}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/marketplace" className={!category ? "chip chip-active" : "chip"}>All</Link>
        {LISTING_CATEGORIES.map((entry) => (
          <Link
            key={entry.value}
            href={`/marketplace?category=${entry.value.toLowerCase()}`}
            className={category?.toUpperCase() === entry.value ? "chip chip-active" : "chip"}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      {viewer ? <ListingComposer /> : null}

      {listings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No listings yet"
            description="Nothing matches these filters. Try another category or city."
            action={<ButtonLink href="/marketplace" variant="secondary">Clear Filters</ButtonLink>}
            icon="🛒"
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link
                href={`/marketplace/${listing.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-[16/9] overflow-hidden bg-brand-100">
                  <SmartImage
                    src={listing.images[0]}
                    alt={listing.title}
                    className="h-full w-full transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="brand">{LISTING_CATEGORIES.find((c) => c.value === listing.category)?.label}</Badge>
                    <Badge tone="neutral">{listing.condition.replace(/_/g, " ")}</Badge>
                    {listing.isNegotiable ? <Badge tone="info">Negotiable</Badge> : null}
                  </div>
                  <h2 className="mt-2 line-clamp-2 font-bold text-ink">{listing.title}</h2>
                  <p className="mt-1 text-lg font-bold text-brand-800">{formatPrice(listing.price)}</p>
                  <p className="text-xs text-ink-soft">
                    {cityLabel(listing.city)} · {relativeDayLabel(listing.createdAt)}
                  </p>
                  <p className="mt-2 border-t border-line pt-2 text-xs text-ink-soft">
                    {listing.seller.sellerProfile?.businessName ?? listing.seller.fullName}
                    {listing.seller.sellerProfile?.isVerified ? " · verified seller" : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-ink-soft">
        {CITIES.length} cities supported. Never transfer money before you have seen the item — Nepal has
        no buyer protection on classifieds.
      </p>
    </Container>
  );
}