import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { cityLabel, formatPrice, AVAILABILITY_SLOTS, SKILL_LABELS } from "@/lib/nepal";
import { Container } from "@/components/ui/container";
import { Avatar, Breadcrumbs, MetaList, ShareRow } from "@/components/ui/misc";
import { Badge, Card, StatTile } from "@/components/ui/primitives";
import { ReviewList } from "@/components/courts/review-list";
import { CoachLessonRequest } from "@/components/coaches/lesson-request";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const coach = await prisma.coachProfile.findUnique({
    where: { slug },
    select: { bio: true, isVerified: true, user: { select: { fullName: true } }, city: true },
  });
  if (!coach) return { title: "Coach not found", robots: { index: false, follow: false } };
  return {
    title: `${coach.user.fullName} — pickleball coach in ${cityLabel(coach.city)}`,
    description:
      coach.bio?.slice(0, 160) ??
      `${coach.user.fullName} coaches pickleball in ${cityLabel(coach.city)}, Nepal. Levels taught, availability and session pricing.`,
    alternates: { canonical: `/coaches/${slug}` },
  };
}

export default async function CoachPage({ params }: { params: Params }) {
  const { slug } = await params;
  const viewer = await getCurrentUser();

  const coach = await prisma.coachProfile.findFirst({
    where: { slug },
    include: {
      user: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      club: { select: { name: true, slug: true } },
      reviews: {
        where: { status: "VISIBLE" },
        include: { reviewer: { select: { fullName: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!coach) notFound();

  const avg = coach.reviews.length
    ? coach.reviews.reduce((sum, r) => sum + r.rating, 0) / coach.reviews.length
    : null;

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Coaches", href: "/coaches" }, { label: coach.user.fullName }]} />

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <Avatar name={coach.user.fullName} src={coach.photoUrl ?? coach.user.avatarUrl} size={88} />
            <div>
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-ink">
                {coach.user.fullName}
                {coach.isVerified ? (
                  <Badge tone="success">Verified coach</Badge>
                ) : (
                  <Badge tone="neutral">Not verified</Badge>
                )}
              </h1>
              <p className="text-sm text-ink-soft">
                {cityLabel(coach.city)}
                {coach.club ? ` · ${coach.club.name}` : ""}
              </p>
            </div>
          </div>

          {coach.bio ? <p className="mt-5 text-ink">{coach.bio}</p> : null}

          <Card className="mt-6">
            <h2 className="font-semibold text-ink">Coaching details</h2>
            <div className="mt-4">
              <MetaList
                items={[
                  { label: "Experience", value: coach.experienceYears ? `${coach.experienceYears} years` : "—" },
                  { label: "Session price", value: coach.pricePerSession ? formatPrice(coach.pricePerSession) : "On request" },
                  { label: "City", value: cityLabel(coach.city) },
                  { label: "Reviews", value: coach.reviews.length },
                ]}
              />
            </div>

            {coach.skillLevelsTaught.length > 0 ? (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="text-sm font-semibold text-ink">Levels taught</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {coach.skillLevelsTaught.map((level) => (
                    <Badge key={level} tone="brand">
                      {SKILL_LABELS[level] ?? level}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {coach.availability.length > 0 ? (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="text-sm font-semibold text-ink">Availability</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {coach.availability.map((slot) => (
                    <Badge key={slot} tone="accent">
                      {AVAILABILITY_SLOTS.find((s) => s.value === slot)?.label ?? slot}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Reviews</h2>
            {avg ? (
              <p className="mt-1 text-sm text-ink-soft">
                {avg.toFixed(1)} ★ from {coach.reviews.length}{" "}
                {coach.reviews.length === 1 ? "review" : "reviews"}
              </p>
            ) : null}
            <div className="mt-4">
              <ReviewList reviews={coach.reviews} />
            </div>
          </section>

          <div className="mt-6">
            <ShareRow title={`${coach.user.fullName} — coach`} path={`/coaches/${coach.slug}`} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h2 className="font-semibold text-ink">Book a lesson</h2>
            <div className="mt-3">
              <CoachLessonRequest
                coachId={coach.id}
                isSignedIn={!!viewer}
                price={coach.pricePerSession}
              />
            </div>
          </Card>

          <StatTile label="Average rating" value={avg ? `${avg.toFixed(1)} ★` : "No reviews yet"} />

          <a
            href={`/players/${coach.user.username}`}
            className="block rounded-2xl border border-line bg-surface-raised p-5 text-sm hover:border-brand-300"
          >
            <span className="font-semibold text-ink">View full player profile</span>
            <span className="mt-1 block text-ink-soft">Statistics, badges and availability</span>
          </a>

          {coach.club ? (
            <a href={`/clubs/${coach.club.slug}`} className="block text-sm font-semibold text-brand-700 hover:underline">
              {coach.club.name} →
            </a>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}