/**
 * Notification service abstraction (REQUIREMENT.md §42, §43, §77).
 *
 * `NotificationService.send(...)` is the single entry point. Channel delivery is
 * implemented separately so adding email/push does not touch call sites.
 */

import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import type { NotificationCategory, NotificationType } from "@prisma/client";

export type NotificationPayload = {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, string | number | null>;
  /** Skip self-notification when the actor triggers their own event. */
  actorId?: string | null;
};

type Preferences = {
  gameInApp: boolean;
  gameEmail: boolean;
  tournamentInApp: boolean;
  tournamentEmail: boolean;
  eventInApp: boolean;
  eventEmail: boolean;
  socialInApp: boolean;
  socialEmail: boolean;
  messageInApp: boolean;
  messageEmail: boolean;
  marketingEmail: boolean;
};

function channelForCategory(
  category: NotificationCategory,
  prefs: Preferences,
): { inApp: boolean; email: boolean } {
  switch (category) {
    case "GAME":
      return { inApp: prefs.gameInApp, email: prefs.gameEmail };
    case "TOURNAMENT":
      return { inApp: prefs.tournamentInApp, email: prefs.tournamentEmail };
    case "EVENT":
      return { inApp: prefs.eventInApp, email: prefs.eventEmail };
    case "SOCIAL":
      return { inApp: prefs.socialInApp, email: prefs.socialEmail };
    case "MESSAGE":
      return { inApp: prefs.messageInApp, email: prefs.messageEmail };
    case "MARKETING":
      return { inApp: true, email: prefs.marketingEmail };
    default:
      return { inApp: true, email: false };
  }
}

async function loadPreferences(userId: string): Promise<Preferences> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  return (
    prefs ?? {
      gameInApp: true,
      gameEmail: false,
      tournamentInApp: true,
      tournamentEmail: false,
      eventInApp: true,
      eventEmail: false,
      socialInApp: true,
      socialEmail: false,
      messageInApp: true,
      messageEmail: false,
      marketingEmail: false,
    }
  );
}

/**
 * Sends a notification. In-app persistence is synchronous; email is fire and
 * forget so a mail outage never blocks a gameplay action.
 */
export class NotificationService {
  static async send(payload: NotificationPayload): Promise<void> {
    if (payload.actorId && payload.actorId === payload.userId) return;

    const prefs = await loadPreferences(payload.userId);
    const { inApp, email } = channelForCategory(payload.category, prefs);

    if (inApp) {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          category: payload.category,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? undefined,
        },
      });
    }

    if (email) {
      void deliverEmail(payload);
    }
  }

  /** Fan-out helper: notify many recipients while skipping the actor. */
  static async sendMany(payloads: NotificationPayload[]): Promise<void> {
    for (const payload of payloads) {
      await NotificationService.send(payload);
    }
  }
}

async function deliverEmail(payload: NotificationPayload): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true, emailVerified: true },
    });
    if (!user?.emailVerified) return;
    await sendEmail({
      to: user.email,
      subject: payload.title,
      text: payload.body,
    });
  } catch (error) {
    console.error("[notifications] email delivery failed", error);
  }
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}