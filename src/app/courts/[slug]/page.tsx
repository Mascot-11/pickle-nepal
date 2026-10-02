import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCourtBySlug, courtRatingSummary } from "@/lib/courts/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { formatPrice, cityLabel } from "@/lib/nepal";
import { Container } from "@/components/ui/container";
import { Badge, Card, EmptyState, StatTile } from "@/components/ui/primitives";
import { Breadcrumbs, MetaList, ShareRow } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { GameCard } from "@/components/games/game-card";
import { CourtReviewForm } from "@/components/courts/court-review-form";
import { BookingPanel } from "@/components/courts/booking-panel";
import { ReviewList } from "@/components/courts/review-list";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const court = await prisma.court.findUnique({
    where: { slug },
    select: { name: true, city: true, description: true, images: true, indoorOutdoor: true },
  });
  if (!court) return { title: "Court not found", robots: { index: false, follow: false } };

  const description =
    court.description?.slice(0, 160) ??
    `${court.name} is a ${court.indoorOutdoor === "INDOOR" ? "indoor" : "outdoor"} pickleball court in ${cityLabel(court.city)}, Nepal. Find games and opening hours.`;

  return {
    title: `${court.name} — pickleball court in ${cityLabel(court.city)}`,
    description,
    alternates: { canonical: `/courts/${slug}` },
    openGraph: {
      title: `${court.name} | PickleNepal`,
      description,
      images: court.images[0]
        ? [{ url: court.images[0], width: 1200, height: 630, alt: court.name }]
        : undefined,
    },
  };
}

export default async function CourtPage({ params }: { params: Params }) {
  const { slug } = await params;
  const court = await getCourtBySlug(slug);
  if (!court) notFound();

  const viewer = await getCurrentUser();
  const bookingsEnabled = await isFeatureEnabled("BOOKINGS");

  const [rating, games] = await Promise.all([
    courtRatingSummary(court.id),
    prisma.game.findMany({
      where: { courtId: court.id, status: { in: ["OPEN", "FULL"] }, startsAt: { gte: new Date() } },
      include: {
        court: { select: { id: true, slug: true, name: true, city: true, images: true, indoorOutdoor: true } },
        creator: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        _count: { select: { participants: true, waitlist: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
  ]);

  await prisma.court.update({ where: { id: court.id }, data: { profileViews: { increment: 1 } } });

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Courts", href: "/courts" }, { label: court.name }]} />

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {court.images.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SmartImage
                src={court.images[0]}
                alt={`${court.name}`}
                className="aspect-[16/9] w-full rounded-2xl sm:col-span-2"
                priority
              />
              {court.images.slice(1, 5).map((image) => (
                <SmartImage key={image} src={image} alt={court.name} className="aspect-[16/9] w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="skeleton aspect-[16/9] w-full rounded-2xl" aria-hidden="true" />
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{court.indoorOutdoor === "INDOOR" ? "Indoor" : "Outdoor"}</Badge>
            <Badge tone="neutral">{court.surface}</Badge>
            {court.hasLighting ? <Badge tone="accent">Floodlit</Badge> : null}
            {court.club ? <Badge tone="info">{court.club.name}</Badge> : null}
            {rating.count > 0 ? <Badge tone="success">★ {rating.overall.toFixed(1)} ({rating.count})</Badge> : null}
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{court.name}</h1>
          <p className="mt-1 text-ink-soft">
            {court.address ?? cityLabel(court.city)}, {cityLabel(court.city)}
          </p>

          {court.description ? (
            <p className="mt-4 whitespace-pre-line text-ink">{court.description}</p>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Price / hour" value={formatPrice(court.pricePerHour)} />
            <StatTile label="Courts" value={court.numberOfCourts} />
            <StatTile label="Upcoming games" value={court._count.games} />
            <StatTile label="Rating" value={rating.count ? `${rating.overall.toFixed(1)} ★` : "—"} />
          </div>

          <Card className="mt-6">
            <h2 className="font-semibold text-ink">Facilities</h2>
            {court.amenities.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No amenities listed yet.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {court.amenities.map((amenity) => (
                  <li key={amenity}>
                    <Badge tone={amenity === "Equipment rental" ? "success" : "neutral"}>
                      {amenity === "Equipment rental" ? "✓ " : ""}
                      {amenity}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <MetaList
                items={[
                  { label: "Paddle rental", value: court.paddleRentalPrice ? `${formatPrice(court.paddleRentalPrice)}` : "Not available" },
                  { label: "Ball rental", value: court.ballRentalPrice ? formatPrice(court.ballRentalPrice) : "Not available" },
                  { label: "Lighting", value: court.hasLighting ? "Yes" : "No" },
                  { label: "Surface", value: court.surface },
                ]}
              />
            </div>

            {court.openingHours ? (
              <div className="mt-5 border-t border-line pt-4">
                <h3 className="text-sm font-semibold text-ink">Opening hours</h3>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  {Object.entries(court.openingHours as Record<string, string>).map(([day, hours]) => (
                    <div key={day} className="flex justify-between gap-2">
                      <dt className="capitalize text-ink-soft">{day}</dt>
                      <dd className="font-medium text-ink">{hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {(court.phone || court.email || court.website) ? (
              <div className="mt-5 flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
                {court.phone ? <a href={`tel:${court.phone}`} className="text-brand-700 hover:underline">📞 {court.phone}</a> : null}
                {court.email ? <a href={`mailto:${court.email}`} className="text-brand-700 hover:underline">✉️ {court.email}</a> : null}
                {court.website ? <a href={court.website} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">🌐 Website</a> : null}
              </div>
            ) : null}
          </Card>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Games at this court</h2>
            {games.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No upcoming games here"
                  description="Be the first to organise something at this court."
                  icon="🏓"
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {games.map((game) => (
                  <GameCard key={game.id} game={game as never} now={new Date()} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Reviews</h2>
            {rating.count > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <StatTile label="Overall" value={`${rating.overall.toFixed(1)} ★`} />
                <StatTile label="Facilities" value={rating.facilities ? rating.facilities.toFixed(1) : "—"} />
                <StatTile label="Court quality" value={rating.courtQuality ? rating.courtQuality.toFixed(1) : "—"} />
                <StatTile label="Staff" value={rating.staff ? rating.staff.toFixed(1) : "—"} />
                <StatTile label="Value" value={rating.value ? rating.value.toFixed(1) : "—"} />
              </div>
            ) : null}

            <div className="mt-4">
              <ReviewList reviews={court.reviews} />
            </div>

            {viewer ? (
              <div className="mt-4">
                <CourtReviewForm courtId={court.id} slug={court.slug} />
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-ink-soft">
                <a href={`/login?next=/courts/${court.slug}`} className="font-semibold text-brand-700 hover:underline">
                  Log in
                </a>{" "}
                to leave a review.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {bookingsEnabled ? (
            <BookingPanel courtId={court.id} pricePerHour={court.pricePerHour} />
          ) : (
            <Card>
              <h2 className="font-semibold text-ink">Book this court</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Online booking is not available yet. Join a game here or contact the club directly.
              </p>
              {court.phone ? (
                <a href={`tel:${court.phone}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
                  Call the court
                </a>
              ) : null}
            </Card>
          )}

          {court.latitude && court.longitude ? (
            <Card>
              <h2 className="text-sm font-semibold text-ink">Location</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {court.latitude.toFixed(4)}, {court.longitude.toFixed(4)}
              </p>
              <a
                href={`https://www.openstreetmap.org/?mlat=${court.latitude}&mlon=${court.longitude}#map=16/${court.latitude}/${court.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                Open in maps ↗
              </a>
            </Card>
          ) : null}

          {court.club ? (
            <Card>
              <h2 className="text-sm font-semibold text-ink">Operated by</h2>
              <a href={`/clubs/${court.club.slug}`} className="mt-1 block font-semibold text-ink hover:text-brand-800">
                {court.club.name} {court.club.isVerified ? "✓" : ""}
              </a>
            </Card>
          ) : null}

          <ShareRow title={court.name} path={`/courts/${court.slug}`} />
        </aside>
      </div>
    </Container>
  );
}