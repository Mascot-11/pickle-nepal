import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-lg"
      >
        🏓
      </span>
      {!compact ? (
        <span className="text-lg font-extrabold tracking-tight text-ink">
          Pickle<span className="text-brand-700">Nepal</span>
        </span>
      ) : null}
      <span className="sr-only">PickleNepal — Find your people. Find your game.</span>
    </span>
  );
}

export function Footer() {
  const sections = [
    {
      title: "Play",
      links: [
        { href: "/games", label: "Find a Game" },
        { href: "/courts", label: "Courts" },
        { href: "/events", label: "Events" },
        { href: "/tournaments", label: "Tournaments" },
      ],
    },
    {
      title: "Community",
      links: [
        { href: "/players", label: "Find Players" },
        { href: "/clubs", label: "Clubs" },
        { href: "/coaches", label: "Coaches" },
        { href: "/community", label: "Feed" },
      ],
    },
    {
      title: "More",
      links: [
        { href: "/rankings", label: "Rankings" },
        { href: "/marketplace", label: "Marketplace" },
        { href: "/about", label: "About" },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-line bg-brand-900 text-brand-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-brand-200">
              The home of pickleball in Nepal. Find your people, find your game.
            </p>
          </div>
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-300">
                {section.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-brand-100 hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-brand-800 pt-6 text-xs text-brand-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PickleNepal. Community-first, built in Nepal.</p>
          <p>
            Rankings shown are PickleNepal community rankings and are not official DUPR ratings.
          </p>
        </div>
      </div>
    </footer>
  );
}