import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Container, SectionHeading } from "@/components/ui/container";
import { EmptyState, Badge } from "@/components/ui/primitives";
import { RelativeTime } from "@/components/ui/misc";
import { formatPrice } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Saved items",
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/games/saved");

  const [saves, favorites] = await Promise.all([
    prisma.savedItem.findMany({
      where: { userId: user.id },
      include: {
        post: { select: { id: true, content: true, createdAt: true } },
        listing: { select: { id: true, slug: true, title: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.marketplaceFavorite.findMany({
      where: { userId: user.id },
      include: { listing: { select: { id: true, slug: true, title: true, price: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  const posts = saves.filter((s) => s.post);
  const listings = saves.filter((s) => s.listing).map((s) => s.listing!);

  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="Saved"
        title="Saved items"
        description="Posts and marketplace listings you saved for later."
      />

      {saves.length === 0 && favorites.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description="Tap Save on a post or listing and it will appear here."
          icon="🔖"
          action={<Link href="/community" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">Browse community</Link>}
        />
      ) : null}

      {posts.length > 0 ? (
        <section>
          <h2 className="text-xl font-bold text-ink">Posts</h2>
          <ul className="mt-4 space-y-2">
            {posts.map((save) =>
              save.post ? (
                <li key={save.id}>
                  <Link
                    href={`/community/${save.post.id}`}
                    className="block rounded-xl border border-line bg-surface-raised p-4 text-sm hover:border-brand-300"
                  >
                    <p className="line-clamp-2 text-ink">{save.post.content}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Saved <RelativeTime value={save.createdAt} />
                    </p>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ) : null}

      {listings.length > 0 || favorites.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-ink">Marketplace listings</h2>
          <ul className="mt-4 space-y-2">
            {[...listings, ...favorites.map((f) => f.listing)].map((listing, index) => (
              <li key={`${listing.id}-${index}`}>
                <Link
                  href={`/marketplace/${listing.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm hover:border-brand-300"
                >
                  <span className="truncate font-medium text-ink">{listing.title}</span>
                  <Badge tone="brand">{formatPrice(listing.price)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}