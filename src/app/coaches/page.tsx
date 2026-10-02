import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Container, SectionHeading } from "@/components/ui/container";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/misc";
import { cityLabel, formatPrice } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Pickleball coaches in Nepal",
  description:
    "Find pickleball coaches in Kathmandu, Pokhara and across Nepal. Filter by city and level taught, compare session prices and request a lesson.",
  alternates: { canonical: "/coaches" },
};

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; verified?: string }>;
}) {
  const { city, verified } = await searchParams;

  const coaches = await prisma.coachProfile.findMany({
    where: {
      ...(city ? { city: city.toUpperCase() as never } : {}),
      ...(verified === "1" ? { isVerified: true } : {}),
    },
    include: {
      user: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      club: { select: { name: true, slug: true } },
      reviews: { where: { status: "VISIBLE" }, select: { rating: true } },
    },
    orderBy: [{ isVerified: "desc" }, { profileViews: "desc" }],
    take: 60,
  });

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Coaches"
        title="Find a coach"
        description="Verified coaches only show a verification badge. Unverified profiles are marked clearly."
        action={
          <Link
            href={verified === "1" ? "/coaches" : "/coaches?verified=1"}
            className={verified === "1" ? "chip chip-active" : "chip"}
          >
            Verified only
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/coaches" className={!city ? "chip chip-active" : "chip"}>All cities</Link>
        {["KATHMANDU", "POKHARA", "LALITPUR", "BHAKTAPUR"].map((value) => (
          <Link
            key={value}
            href={`/coaches?city=${value.toLowerCase()}`}
            className={city?.toUpperCase() === value ? "chip chip-active" : "chip"}
          >
            {cityLabel(value)}
          </Link>
        ))}
      </div>

      {coaches.length === 0 ? (
        <EmptyState title="No coaches listed" description="Coach profiles appear here as they are created and verified." icon="🎓" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => {
            const avg = coach.reviews.length
              ? coach.reviews.reduce((sum, r) => sum + r.rating, 0) / coach.reviews.length
              : null;
            return (
              <li key={coach.id}>
                <Link
                  href={`/coaches/${coach.slug}`}
                  className="flex h-full flex-col rounded-2xl border border-line bg-surface-raised p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={coach.user.fullName} src={coach.photoUrl ?? coach.user.avatarUrl} size={48} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-bold text-ink">
                        {coach.user.fullName}
                        {coach.isVerified ? (
                          <span title="Verified coach" aria-label="Verified coach" className="text-brand-700">
                            ✓
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-sm text-ink-soft">
                        {cityLabel(coach.city)}
                        {coach.experienceYears ? ` · ${coach.experienceYears} yrs` : ""}
                      </p>
                    </div>
                  </div>

                  {coach.bio ? <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{coach.bio}</p> : null}

                  <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                    {avg ? <Badge tone="success">{avg.toFixed(1)} ★ ({coach.reviews.length})</Badge> : null}
                    <Badge tone={coach.pricePerSession ? "warning" : "success"}>
                      {coach.pricePerSession ? `${formatPrice(coach.pricePerSession)}/session` : "Pricing on request"}
                    </Badge>
                    {!coach.isVerified ? <Badge tone="neutral">Not verified</Badge> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}