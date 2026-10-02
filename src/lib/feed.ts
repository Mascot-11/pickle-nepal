/**
 * Community feed service abstraction (REQUIREMENT.md §76).
 *
 * Ranking lives here rather than in the page so it can evolve independently.
 */

import "server-only";
import { prisma } from "@/lib/db";
import type { PostType } from "@prisma/client";

export type FeedMode = "newest" | "following" | "popular";

export type FeedQuery = {
  mode: FeedMode;
  viewerId: string | null;
  city?: string | null;
  type?: PostType | null;
  cursor?: string | null;
  limit?: number;
};

export const FEED_PAGE_SIZE = 12;

export async function getFeed(query: FeedQuery) {
  const limit = Math.min(query.limit ?? FEED_PAGE_SIZE, 30);

  const cursorFilter = query.cursor ? { id: { lt: query.cursor } } : {};

  const baseWhere = {
    isHidden: false,
    deletedAt: null,
    author: { status: "ACTIVE" as const, deletedAt: null },
    ...cursorFilter,
    ...(query.type ? { type: query.type } : {}),
  };

  let where: Record<string, unknown> = baseWhere;

  if (query.mode === "following" && query.viewerId) {
    const following = await prisma.follow.findMany({
      where: { followerId: query.viewerId },
      select: { followingId: true },
    });
    const ids = following.map((f) => f.followingId);
    where = { ...baseWhere, authorId: { in: ids.length ? ids : ["__none__"] } };
  }

  const posts = await prisma.communityPost.findMany({
    where: where as never,
    include: {
      author: {
        select: { id: true, fullName: true, username: true, avatarUrl: true, city: true },
      },
      _count: { select: { likes: true, comments: true } },
      likes: query.viewerId ? { where: { userId: query.viewerId }, select: { id: true } } : false,
      saves: query.viewerId ? { where: { userId: query.viewerId }, select: { id: true } } : false,
    },
    orderBy: query.mode === "popular" ? [{ createdAt: "desc" }] : [{ createdAt: "desc" }],
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  // "Popular" ranks by engagement inside the returned window, keeping the
  // initial (cheap) query untouched.
  const ordered =
    query.mode === "popular"
      ? [...page].sort(
          (a, b) =>
            b._count.likes + b._count.comments * 2 - (a._count.likes + a._count.comments * 2),
        )
      : page;

  return {
    posts: ordered,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}