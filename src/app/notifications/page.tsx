import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import { Container, SectionHeading } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/primitives";
import { RelativeTime } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

function linkFor(type: string, data: unknown): string | null {
  const payload = (data ?? {}) as Record<string, string | undefined>;
  if (payload.gameId) return `/games/${payload.gameId}`;
  if (payload.conversationId) return `/messages/${payload.conversationId}`;
  if (payload.postId) return `/community/${payload.postId}`;
  if (payload.userId) return `/players`;
  return null;
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="Notifications"
        title="Notifications"
        description={
          unread > 0 ? `${unread} unread` : "You're all caught up."
        }
        action={
          unread > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="text-sm font-semibold text-brand-700 hover:underline">
                Mark all as read
              </button>
            </form>
          ) : (
            <Link href="/settings/notifications" className="text-sm font-semibold text-brand-700 hover:underline">
              Notification settings
            </Link>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="Join a game or follow a few players and updates will show up here."
          icon="🔔"
          action={
            <Link href="/games" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              Find a game
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const href = linkFor(notification.type, notification.data);
            const content = (
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  notification.readAt ? "border-line bg-surface-raised" : "border-brand-200 bg-brand-50"
                }`}
              >
                <span aria-hidden="true" className="text-lg">
                  {iconFor(notification.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{notification.title}</p>
                  <p className="text-sm text-ink-soft">{notification.body}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    <RelativeTime value={notification.createdAt} />
                  </p>
                </div>
                {!notification.readAt ? (
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
                ) : null}
              </div>
            );

            return (
              <li key={notification.id}>
                {href ? (
                  <Link href={href} className="block hover:opacity-90">
                    {content}
                  </Link>
                ) : (
                  <form action={markNotificationReadAction.bind(null, notification.id)}>{content}</form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}

function iconFor(type: string): string {
  switch (type) {
    case "GAME_JOINED":
    case "GAME_LEFT":
    case "GAME_UPDATED":
      return "🏓";
    case "WAITLIST_AVAILABLE":
    case "WAITLIST_PROMOTED":
      return "⏳";
    case "GAME_CANCELLED":
      return "⚠️";
    case "TOURNAMENT_REGISTRATION":
    case "TOURNAMENT_UPDATE":
      return "🏆";
    case "EVENT_REMINDER":
    case "EVENT_UPDATE":
      return "📅";
    case "LIKE":
      return "♥";
    case "COMMENT":
      return "💬";
    case "FOLLOW":
      return "👤";
    case "MESSAGE":
      return "✉️";
    case "BADGE_EARNED":
      return "🏅";
    case "VERIFICATION_RESULT":
      return "✓";
    case "BOOKING_STATUS":
      return "📋";
    default:
      return "🔔";
  }
}