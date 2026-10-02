import Link from "next/link";

export function NotificationBell({ count }: { count: number }) {
  return (
    <Link
      href="/notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line text-lg hover:bg-brand-50"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
    >
      <span aria-hidden="true">🔔</span>
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function MessageBell({ count }: { count: number }) {
  return (
    <Link
      href="/messages"
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line text-lg hover:bg-brand-50"
      aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
    >
      <span aria-hidden="true">✉️</span>
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}