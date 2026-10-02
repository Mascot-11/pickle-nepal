import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit-logs", label: "Audit logs" },
  { href: "/admin/clubs", label: "Clubs" },
  { href: "/admin/courts", label: "Courts" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/marketplace", label: "Marketplace" },
];

export function AdminNav() {
  return (
    <nav aria-label="Admin sections" className="rounded-2xl border border-line bg-surface-raised p-3">
      <ul className="space-y-0.5">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-800"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}