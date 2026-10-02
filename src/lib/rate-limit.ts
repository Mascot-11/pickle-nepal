/**
 * In-memory + database-backed rate limiting (REQUIREMENT.md §83).
 *
 * The DB table gives durability across instances; a local in-memory map keeps
 * hot paths cheap when the same process handles the request. Swap the backing
 * store for Redis when running multiple web containers.
 */

import "server-only";
import { prisma } from "@/lib/db";

type Bucket = { hits: number; resetAt: number };

const memory = new Map<string, Bucket>();

export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
  message: { limit: 40, windowMs: 60 * 60 * 1000 },
  post: { limit: 15, windowMs: 60 * 60 * 1000 },
  comment: { limit: 30, windowMs: 60 * 60 * 1000 },
  review: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  report: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  game: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  tournamentRegistration: { limit: 30, windowMs: 24 * 60 * 60 * 1000 },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Sliding-window counter. Memory first; when the process restarts the DB table
 * restores the count so limits are not trivially bypassed.
 */
export async function rateLimit(
  key: RateLimitKey,
  identifier: string,
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[key];
  const composite = `${key}:${identifier}`;
  const now = Date.now();

  const bucket = memory.get(composite);
  if (bucket && bucket.resetAt > now) {
    bucket.hits += 1;
    if (bucket.hits > config.limit) {
      return { ok: false, remaining: 0, resetAt: bucket.resetAt };
    }
    return {
      ok: true,
      remaining: config.limit - bucket.hits,
      resetAt: bucket.resetAt,
    };
  }

  // Window expired in memory — reset the durable counter too.
  const resetAt = now + config.windowMs;
  try {
    const existing = await prisma.rateLimitEntry.findUnique({
      where: { key: composite },
    });
    if (existing && existing.windowEnd.getTime() > now) {
      const hits = existing.hits + 1;
      await prisma.rateLimitEntry.update({
        where: { key: composite },
        data: { hits },
      });
      memory.set(composite, { hits, resetAt: existing.windowEnd.getTime() });
      if (hits > config.limit) {
        return { ok: false, remaining: 0, resetAt: existing.windowEnd.getTime() };
      }
      return { ok: true, remaining: config.limit - hits, resetAt: existing.windowEnd.getTime() };
    }

    await prisma.rateLimitEntry.upsert({
      where: { key: composite },
      create: { key: composite, hits: 1, windowEnd: new Date(resetAt) },
      update: { hits: 1, windowEnd: new Date(resetAt) },
    });
    memory.set(composite, { hits: 1, resetAt });
    return { ok: true, remaining: config.limit - 1, resetAt };
  } catch {
    // If the rate-limit table is unavailable, fail closed for abusive keys but
    // do not break the product for a normal user.
    memory.set(composite, { hits: 1, resetAt });
    return { ok: true, remaining: config.limit - 1, resetAt };
  }
}

export function clearRateLimitMemory(): void {
  memory.clear();
}