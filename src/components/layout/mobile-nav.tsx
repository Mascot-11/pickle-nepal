"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/games", label: "Games", icon: "🏓" },
  { href: "/courts", label: "Courts", icon: "📍" },
  { href: "/community", label: "Community", icon: "💬" },
  { href: "/profile", label: "Profile", icon: "👤" },
] as const;

export function MobileNav({ isSignedIn }: { isSignedIn: boolean }) {
  const pathname = usePathname();
  const items = isSignedIn ? ITEMS : [...ITEMS.slice(0, 3), { href: "/register", label: "Join", icon: "✨" } as const];

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
                  active ? "text-brand-700" : "text-ink-soft"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}