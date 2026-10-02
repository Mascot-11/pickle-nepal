import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { LISTING_CATEGORIES, cityLabel, formatPrice } from "@/lib/nepal";
import { relativeDayLabel } from "@/lib/dates";
import { Container } from "@/components/ui/container";
import { Avatar, Breadcrumbs, ShareRow } from "@/components/ui/misc";
import { Badge, Card } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/smart-image";
import { SellerActions } from "@/components/marketplace/seller-actions";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await prisma.marketplaceListing.findUnique({
    where: { slug },
    select: { title: true, description: true, images: true },
  });
  if (!listing) return { title: "Listing not found", robots: { index: false, follow: false } };
  return {
    title: `${listing.title} — for sale`,
    description: listing.description.slice(0, 160),
    alternates: { canonical: `/marketplace/${slug}` },
    openGraph: {
      title: `${listing.title} | PickleNepal marketplace`,
      description: listing.description.slice(0, 160),
      images: listing.images[0] ? [{ url: listing.images[0], width: 1200, height: 630, alt: listing.title }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Params }) {
  const { slug } = await params;
  const viewer = await getCurrentUser();

  if (!(await isFeatureEnabled("MARKETPLACE"))) notFound();

  const listing = await prisma.marketplaceListing.findFirst({
    where: { slug, deletedAt: null },
    include: {
      seller: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          city: true,
          sellerProfile: { select: { businessName: true, description: true, isVerified: true, phone: true } },
        },
      },
      favorites: viewer ? { where: { userId: viewer.id }, select: { id: true } } : false,
      _count: { select: { favorites: true } },
    },
  });

  if (!listing) notFound();

  const isOwner = viewer?.id === listing.sellerId;

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Marketplace", href: "/marketplace" }, { label: listing.title }]} />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {listing.images.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {listing.images.map((image) => (
                <SmartImage key={image} src={image} alt={listing.title} className="aspect-[4/3] w-full rounded-2xl" priority={image === listing.images[0]} />
              ))}
            </div>
          ) : (
            <div className="skeleton aspect-[4/3] w-full rounded-2xl" aria-hidden="true" />
          )}

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">{listing.title}</h1>
          <p className="mt-2 text-2xl font-bold text-brand-800">{formatPrice(listing.price)}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="brand">{LISTING_CATEGORIES.find((c) => c.value === listing.category)?.label}</Badge>
            <Badge tone="neutral">{listing.condition.replace(/_/g, " ")}</Badge>
            {listing.isNegotiable ? <Badge tone="info">Negotiable</Badge> : null}
            {listing.status === "SOLD" ? <Badge tone="danger">Sold</Badge> : null}
          </div>

          <Card className="mt-5">
            <h2 className="font-semibold text-ink">Description</h2>
            <p className="mt-2 whitespace-pre-line text-ink">{listing.description}</p>
            <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft">
              Listed {relativeDayLabel(listing.createdAt)} · {cityLabel(listing.city)}
            </p>
          </Card>

          <div className="mt-6">
            <ShareRow title={listing.title} path={`/marketplace/${listing.slug}`} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h2 className="font-semibold text-ink">Seller</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={listing.seller.fullName} src={listing.seller.avatarUrl} size={44} />
              <div>
                <a href={`/players/${listing.seller.username}`} className="font-semibold text-ink hover:text-brand-800">
                  {listing.seller.sellerProfile?.businessName ?? listing.seller.fullName}
                </a>
                <p className="text-xs text-ink-soft">{cityLabel(listing.seller.city)}</p>
              </div>
            </div>
            {listing.seller.sellerProfile?.isVerified ? (
              <Badge tone="success" className="mt-2">Verified seller</Badge>
            ) : (
              <p className="mt-2 text-xs text-ink-soft">This seller is not verified. Meet in a public place.</p>
            )}
            {listing.seller.sellerProfile?.description ? (
              <p className="mt-3 text-sm text-ink-soft">{listing.seller.sellerProfile.description}</p>
            ) : null}

            <div className="mt-4 border-t border-line pt-3">
              <SellerActions
                listingId={listing.id}
                sellerId={listing.sellerId}
                isOwner={isOwner}
                isSignedIn={!!viewer}
                isSaved={Array.isArray(listing.favorites) && listing.favorites.length > 0}
                isSold={listing.status === "SOLD"}
              />
            </div>
          </Card>

          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Safety first: meet in a public place, inspect the item before paying, and never send an
            advance payment to a stranger.
          </p>
        </aside>
      </div>
    </Container>
  );
}