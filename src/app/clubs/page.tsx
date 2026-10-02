import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/misc";
import { cityLabel } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Pickleball clubs in Nepal",
  description:
    "Browse pickleball clubs in Kathmandu, Lalitpur, Pokhara and beyond. See courts, coaching, events and community games run by each club.",
  alternates: { canonical: "/clubs" },
};

export default async function ClubsPage() {
  const clubs = await prisma.club.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { courts: true, games: true, events: true, members: true } },
    },
    orderBy: [{ isVerified: "desc" }, { profileViews: "desc" }],
    take: 48,
  });

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Clubs"
        title="Clubs across Nepal"
        description="Clubs run courts, publish games and events, and host community sessions."
        action={<ButtonLink href="/clubs" variant="secondary">All clubs</ButtonLink>}
      />

      {clubs.length === 0 ? (
        <EmptyState title="No clubs listed yet" description="Club profiles appear here once they are added." icon="🏢" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <li key={club.id}>
              <Link
                href={`/clubs/${club.slug}`}
                className="flex h-full flex-col rounded-2xl border border-line bg-surface-raised p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={club.name} src={club.logoUrl} size={48} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-bold text-ink">
                      {club.name}
                      {club.isVerified ? (
                        <span title="Verified club" aria-label="Verified" className="text-brand-700">
                          ✓
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-ink-soft">
                      {cityLabel(club.city)} · {club._count.courts}{" "}
                      {club._count.courts === 1 ? "court" : "courts"}
                    </p>
                  </div>
                </div>

                {club.description ? (
                  <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{club.description}</p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-line pt-3">
                  <Badge tone="brand">{club._count.games} games</Badge>
                  <Badge tone="neutral">{club._count.events} events</Badge>
                  <Badge tone="neutral">{club._count.members} members</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}