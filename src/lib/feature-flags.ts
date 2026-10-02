/**
 * Feature flags (REQUIREMENT.md §63). Read from DB with a process-level cache;
 * defaults are all-off so an unconfigured feature is safely disabled.
 */

import "server-only";
import { prisma } from "@/lib/db";
import { FEATURE_FLAGS, type FeatureFlagKey } from "@/lib/nepal";

const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  BOOKINGS: false,
  PAYMENTS: false,
  MARKETPLACE: false,
  PREMIUM: false,
  MESSAGING: true,
  PUSH_NOTIFICATIONS: false,
  DUPR_INTEGRATION: false,
  SPONSOR_ADS: false,
};

let cache: Map<string, boolean> | null = null;
let cachedAt = 0;
const TTL_MS = 15_000;

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const now = Date.now();
  if (!cache || now - cachedAt > TTL_MS) {
    cache = new Map();
    for (const flag of FEATURE_FLAGS) {
      cache.set(flag, DEFAULTS[flag]);
    }
    try {
      const rows = await prisma.featureFlag.findMany();
      for (const row of rows) {
        if ((FEATURE_FLAGS as readonly string[]).includes(row.key)) {
          cache.set(row.key as FeatureFlagKey, row.enabled);
        }
      }
    } catch {
      // Table may not exist yet during first boot — defaults are safe.
    }
    cachedAt = now;
  }
  return cache.get(key) ?? DEFAULTS[key];
}

export async function allFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const result = {} as Record<FeatureFlagKey, boolean>;
  for (const flag of FEATURE_FLAGS) {
    result[flag] = await isFeatureEnabled(flag);
  }
  return result;
}

export async function setFeatureFlag(
  key: FeatureFlagKey,
  enabled: boolean,
  description?: string,
): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, enabled, description },
    update: { enabled, description },
  });
  cache = null;
}