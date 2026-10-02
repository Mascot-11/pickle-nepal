import type { Metadata } from "next";
import Link from "next/link";
import { listCourts, COURT_PAGE_SIZE } from "@/lib/courts/queries";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { Pagination } from "@/components/ui/misc";
import { CourtCard } from "@/components/courts/court-card";
import { CourtFilters, CourtMapToggle, CourtMapView } from "@/components/courts/court-explorer";

export const metadata: Metadata = {
  title: "Pickleball courts in Nepal",
  description:
    "Browse pickleball courts in Kathmandu, Lalitpur, Pokhara, Bhaktapur and more. Filter by city, indoor or outdoor, surface and amenities, then find games at those courts.",
  alternates: { canonical: "/courts" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function CourtsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(single(params.page) ?? "1") || 1);
  const view = single(params.view) === "map" ? "map" : "list";

  const { courts, total, pageCount } = await listCourts({
    city: single(params.city)?.toUpperCase() ?? null,
    indoorOutdoor: single(params.indoorOutdoor)?.toUpperCase() ?? null,
    surface: single(params.surface)?.toUpperCase() ?? null,
    amenity: single(params.amenity) ?? null,
    q: single(params.q),
    minPrice: single(params.minPrice) ? Number(single(params.minPrice)) : null,
    maxPrice: single(params.maxPrice) ? Number(single(params.maxPrice)) : null,
    sort: (single(params.sort) as "name" | "price_asc" | "price_desc" | null) ?? null,
    page,
    limit: COURT_PAGE_SIZE,
  });

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const flat = single(value);
      if (flat) search.set(key, flat);
    }
    if (nextPage > 1) search.set("page", String(nextPage));
    else search.delete("page");
    const query = search.toString();
    return query ? `/courts?${query}` : "/courts";
  };

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Courts"
        title="Find a court"
        description={`${total} ${total === 1 ? "court" : "courts"} listed. Choose a city or use the map — GPS is optional.`}
        action={<CourtMapToggle current={view} />}
      />

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <aside className="mb-6 lg:mb-0">
          <CourtFilters />
        </aside>

        <section aria-label="Courts">
          {view === "map" ? (
            <CourtMapView
              courts={courts.map((court) => ({
                id: court.id,
                slug: court.slug,
                name: court.name,
                city: court.city,
                latitude: court.latitude,
                longitude: court.longitude,
                pricePerHour: court.pricePerHour,
                images: court.images,
                indoorOutdoor: court.indoorOutdoor,
                rating: 0,
              }))}
            />
          ) : courts.length === 0 ? (
            <EmptyState
              title="No courts match your filters"
              description="Try a different city, or clear your filters to see everything."
              action={
                <ButtonLink href="/courts" variant="secondary">
                  Clear Filters
                </ButtonLink>
              }
              icon="📍"
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {courts.map((court) => (
                  <CourtCard key={court.id} court={court} />
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
            </>
          )}

          <p className="mt-6 text-sm text-ink-soft">
            Court details are maintained by clubs and court operators.{" "}
            <Link href="/clubs" className="font-medium text-brand-700 hover:underline">
              Browse clubs
            </Link>{" "}
            or{" "}
            <Link href="/games" className="font-medium text-brand-700 hover:underline">
              find a game
            </Link>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}