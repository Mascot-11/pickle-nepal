"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth/session";

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);

  const links: Array<{ href: string; label: string; icon: string }> = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/profile", label: "My profile", icon: "👤" },
    { href: "/games/my-games", label: "My games", icon: "🏓" },
    { href: "/games/saved", label: "Saved", icon: "🔖" },
    { href: "/messages", label: "Messages", icon: "✉️" },
    { href: "/notifications", label: "Notifications", icon: "🔔" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  if (user.role === "ADMIN" || user.role === "MODERATOR") {
    links.push({ href: "/admin", label: "Admin", icon: "🛡️" });
  }
  if (user.role === "CLUB_ADMIN") {
    links.push({ href: "/club/dashboard", label: "Club dashboard", icon: "🏢" });
  }
  if (user.role === "ORGANIZER") {
    links.push({ href: "/organizer/dashboard", label: "Organizer", icon: "🏆" });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-line px-2 py-1.5 text-sm font-medium hover:bg-brand-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-200 text-xs font-bold text-brand-900">
          {user.fullName.slice(0, 2).toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{user.fullName.split(" ")[0]}</span>
        <span aria-hidden="true" className="text-ink-soft">
          ▾
        </span>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-lg"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
              <p className="truncate text-xs text-ink-soft">@{user.username}</p>
            </div>
            <ul className="py-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink hover:bg-brand-50"
                  >
                    <span aria-hidden="true">{link.icon}</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <form action="/api/auth/logout" method="post" className="border-t border-line">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <span aria-hidden="true">↪</span> Log out
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function useLogout() {
}