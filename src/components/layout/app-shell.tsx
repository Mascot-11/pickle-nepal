import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { unreadNotificationCount } from "@/lib/notifications/service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchBar } from "@/components/layout/search-bar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { MessageBell } from "@/components/layout/message-bell";

const NAV_LINKS = [
  { href: "/players", label: "Discover" },
  { href: "/games", label: "Find a Game" },
  { href: "/courts", label: "Courts" },
  { href: "/events", label: "Events" },
  { href: "/community", label: "Community" },
  { href: "/rankings", label: "Rankings" },
] as const;

/** Header + mobile bottom nav. Rendered once in the root layout. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const [user, messagingEnabled] = await Promise.all([
    getCurrentUser(),
    isFeatureEnabled("MESSAGING"),
  ]);

  const [unreadNotifications, unreadMessages] = user
    ? await Promise.all([
        unreadNotificationCount(user.id),
        messagingEnabled
          ? prisma.conversationParticipant
              .findMany({
                where: { userId: user.id },
                select: { unreadCount: true },
              })
              .then((rows) => rows.reduce((sum, r) => sum + r.unreadCount, 0))
          : Promise.resolve(0),
      ])
    : [0, 0];

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="PickleNepal home" className="shrink-0">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <SearchBar />
            </div>
            {user ? (
              <>
                <NotificationBell count={unreadNotifications} />
                {messagingEnabled ? <MessageBell count={unreadMessages} /> : null}
                <UserMenu user={user} />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-brand-50"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="pb-24 lg:pb-12">
        {children}
      </main>

      <MobileNav isSignedIn={!!user} />
    </>
  );
}