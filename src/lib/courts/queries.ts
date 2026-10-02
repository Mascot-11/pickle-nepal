import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CourtListFilters = {
  city?: string | null;
  indoorOutdoor?: string | null;
  surface?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  amenity?: string | null;
  q?: string | null;
  sort?: "name" | "price_asc" | "price_desc" | null;
  page?: number;
  limit?: number;
};

export const COURT_PAGE_SIZE = 12;

export async function listCourts(filters: CourtListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(filters.limit ?? COURT_PAGE_SIZE, 48);

  const where: Prisma.CourtWhereInput = {
    isActive: true,
    deletedAt: null,
    ...(filters.city ? { city: filters.city as never } : {}),
    ...(filters.indoorOutdoor ? { indoorOutdoor: filters.indoorOutdoor as never } : {}),
    ...(filters.surface ? { surface: filters.surface as never } : {}),
    ...(filters.amenity ? { amenities: { has: filters.amenity } } : {}),
    ...(filters.minPrice || filters.maxPrice
      ? {
          pricePerHour: {
            ...(filters.minPrice ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice ? { lte: filters.maxPrice } : {}),
          },
        }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { address: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.CourtOrderByWithRelationInput[] =
    filters.sort === "price_asc"
      ? [{ pricePerHour: "asc" }, { name: "asc" }]
      : filters.sort === "price_desc"
        ? [{ pricePerHour: "desc" }, { name: "asc" }]
        : filters.sort === "name"
          ? [{ name: "asc" }]
          : [{ profileViews: "desc" }, { name: "asc" }];

  const [courts, total] = await Promise.all([
    prisma.court.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        images: true,
        indoorOutdoor: true,
        surface: true,
        pricePerHour: true,
        amenities: true,
        latitude: true,
        longitude: true,
        hasLighting: true,
        _count: { select: { reviews: true, games: true } },
      },
    }),
    prisma.court.count({ where }),
  ]);

  return { courts, total, page, pageCount: Math.ceil(total / limit) };
}

export async function getCourtBySlug(slug: string) {
  return prisma.court.findFirst({
    where: { slug, deletedAt: null },
    include: {
      club: { select: { id: true, name: true, slug: true, logoUrl: true, isVerified: true } },
      reviews: {
        where: { status: "VISIBLE" },
        include: {
          reviewer: { select: { username: true, fullName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: { select: { games: true, bookings: true, reviews: true } },
    },
  });
}

export async function courtRatingSummary(courtId: string) {
  const aggregate = await prisma.review.aggregate({
    where: { courtId, status: "VISIBLE" },
    _avg: { rating: true, facilities: true, courtQuality: true, staffRating: true, valueRating: true },
    _count: { _all: true },
  });
  return {
    count: aggregate._count._all,
    overall: aggregate._avg.rating ?? 0,
    facilities: aggregate._avg.facilities ?? 0,
    courtQuality: aggregate._avg.courtQuality ?? 0,
    staff: aggregate._avg.staffRating ?? 0,
    value: aggregate._avg.valueRating ?? 0,
  };
}