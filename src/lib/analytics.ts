/**
 * Analytics event tracking (REQUIREMENT.md §60).
 *
 * Fire-and-forget writes of non-sensitive facts. No email, phone, or location
 * is ever recorded here.
 */

import "server-only";
import { prisma } from "@/lib/db";
import type { AnalyticsEventName } from "@prisma/client";

export type TrackInput = {
  name: AnalyticsEventName;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean>;
};

export async function track(input: TrackInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name: input.name,
        userId: input.userId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[analytics] failed to record event", error);
  }
}