import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { CITIES } from "@/lib/nepal";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// The sitemap reads live data, so it is generated per request rather than at
// build time (the Docker build has no database).
export const dynamic = "force-dynamic";

/** Public, indexable URLs only (§53). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courts, clubs, coaches, tournaments, events, players] = await Promise.all([
    prisma.court.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.club.findMany({ where: { deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.coachProfile.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.tournament.findMany({ select: { slug: true, updatedAt: true, status: true } }),
    prisma.event.findMany({ where: { isCancelled: false }, select: { slug: true, updatedAt: true } }),
    prisma.playerProfile.findMany({
      where: { visibility: "PUBLIC", user: { status: "ACTIVE", deletedAt: null } },
      select: { user: { select: { username: true } } },
      take: 500,
    }),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${APP_URL}/games`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${APP_URL}/courts`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${APP_URL}/players`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/events`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/tournaments`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/clubs`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${APP_URL}/coaches`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${APP_URL}/community`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${APP_URL}/rankings`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${APP_URL}/marketplace`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${APP_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const cityRoutes: MetadataRoute.Sitemap = CITIES.flatMap((city) => [
    {
      url: `${APP_URL}/games?city=${city.value.toLowerCase()}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    },
    {
      url: `${APP_URL}/courts?city=${city.value.toLowerCase()}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
  ]);

  return [
    ...staticRoutes,
    ...cityRoutes,
    ...courts.map((court) => ({ url: `${APP_URL}/courts/${court.slug}`, lastModified: court.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...clubs.map((club) => ({ url: `${APP_URL}/clubs/${club.slug}`, lastModified: club.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...coaches.map((coach) => ({ url: `${APP_URL}/coaches/${coach.slug}`, lastModified: coach.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...tournaments
      .filter((t) => t.status !== "DRAFT")
      .map((tournament) => ({ url: `${APP_URL}/tournaments/${tournament.slug}`, lastModified: tournament.updatedAt, changeFrequency: "daily" as const, priority: 0.7 })),
    ...events.map((event) => ({ url: `${APP_URL}/events/${event.slug}`, lastModified: event.updatedAt, changeFrequency: "daily" as const, priority: 0.6 })),
    ...players.map((player) => ({ url: `${APP_URL}/players/${player.user.username}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}