/**
 * Slug + username helpers. Slugs are user/seed friendly and collision-safe by
 * appending a short random suffix when a base is taken (§85).
 */

import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** Derives a candidate slug; caller resolves collisions with `uniqueSlug`. */
export function uniqueSlug(base: string, exists: (candidate: string) => Promise<boolean>): Promise<string> {
  const clean = slugify(base) || "item";
  return (async () => {
    if (!(await exists(clean))) return clean;
    for (let i = 0; i < 8; i += 1) {
      const candidate = `${clean}-${nanoid().slice(0, 5)}`;
      if (!(await exists(candidate))) return candidate;
    }
    return `${clean}-${nanoid()}`;
  })();
}

export function normalizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
}

export function randomToken(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

export function randomReferralCode(): string {
  return `PN${nanoid().slice(0, 8).toUpperCase()}`;
}