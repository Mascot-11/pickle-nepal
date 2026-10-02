"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDebounced } from "@/components/providers/toast";
import type { SearchResults } from "@/lib/search";

type SuggestionGroup = {
  key: keyof Omit<SearchResults, "query">;
  label: string;
  items: Array<{ id: string; href: string; primary: string; secondary?: string }>;
};

const LABELS: Record<string, string> = {
  players: "Players",
  courts: "Courts",
  clubs: "Clubs",
  coaches: "Coaches",
  games: "Games",
  events: "Events",
  tournaments: "Tournaments",
  posts: "Posts",
};

export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const debounced = useDebounced(term, 250);
  const containerRef = useRef<HTMLDivElement>(null);
  // Recent searches are read after mount because localStorage is browser-only.
  const [recent, setRecent] = useState<string[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);

  useEffect(() => {
    // Deferred so the state update does not run synchronously inside the effect.
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("pn_recent_searches");
      if (stored) {
        try {
          setRecent(JSON.parse(stored) as string[]);
        } catch {
          setRecent([]);
        }
      }
      setRecentLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (debounced.trim().length < 2) return;

    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debounced.trim())}`, {
          signal: controller.signal,
        });
        const data: SearchResults | null = response.ok ? await response.json() : null;
        setResults(data);
      } catch {
        setResults(null);
      }
    };
    void load();
    return () => controller.abort();
  }, [debounced]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, 6);
    setRecent(next);
    window.localStorage.setItem("pn_recent_searches", JSON.stringify(next));
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  // Short terms never show results; derived rather than stored so the effect
  // does not need a synchronous setState.
  const visibleResults = debounced.trim().length >= 2 ? results : null;

  const groups: SuggestionGroup[] = visibleResults
    ? (Object.keys(LABELS) as Array<keyof Omit<SearchResults, "query">>)
        .map((key) => {
          const raw = visibleResults[key] as Array<Record<string, unknown>>;
          return {
            key,
            label: LABELS[key],
            items: raw.slice(0, 4).map((item) => mapToSuggestion(key, item)),
          };
        })
        .filter((group) => group.items.length > 0)
    : [];

  return (
    <div ref={containerRef} className="relative">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(term);
        }}
      >
        <label htmlFor="global-search" className="sr-only">
          Search PickleNepal
        </label>
        <input
          id="global-search"
          type="search"
          value={term}
          autoFocus={autoFocus}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players, courts, games…"
          className="w-48 rounded-full border border-line bg-surface px-4 py-2 text-sm placeholder:text-ink-soft focus:w-64 lg:w-56 lg:focus:w-72"
          aria-controls="search-suggestions"
        />
      </form>

      {open ? (
        <div
          id="search-suggestions"
          className="absolute right-0 z-50 mt-2 max-h-[70vh] w-96 overflow-y-auto rounded-2xl border border-line bg-surface-raised p-2 shadow-xl"
        >
          {term.trim().length < 2 ? (
            recentLoaded && recent.length > 0 ? (
              <div className="p-2">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Recent searches
                </p>
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => submit(item)}
                    className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-brand-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-3 text-sm text-ink-soft">
                Search for players, courts, clubs, coaches, games, events, tournaments and posts.
              </p>
            )
          ) : groups.length === 0 ? (
            <p className="p-3 text-sm text-ink-soft">No results for “{term}”.</p>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="mb-1">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {group.label} ({visibleResults?.[group.key]?.length ?? 0})
                </p>
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    className="block rounded-lg px-2 py-1.5 hover:bg-brand-50"
                  >
                    <span className="block text-sm font-medium text-ink">{item.primary}</span>
                    {item.secondary ? (
                      <span className="block text-xs text-ink-soft">{item.secondary}</span>
                    ) : null}
                  </a>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function mapToSuggestion(
  key: string,
  item: Record<string, unknown>,
): { id: string; href: string; primary: string; secondary?: string } {
  switch (key) {
    case "players":
      return {
        id: String(item.id),
        href: `/players/${item.username}`,
        primary: String(item.fullName),
        secondary: `@${item.username}`,
      };
    case "courts":
      return {
        id: String(item.id),
        href: `/courts/${item.slug}`,
        primary: String(item.name),
        secondary: String(item.city),
      };
    case "clubs":
      return {
        id: String(item.id),
        href: `/clubs/${item.slug}`,
        primary: String(item.name),
        secondary: String(item.city),
      };
    case "coaches":
      return {
        id: String(item.id),
        href: `/coaches/${item.slug}`,
        primary: String(item.name),
        secondary: String(item.city),
      };
    case "games":
      return { id: String(item.id), href: `/games/${item.id}`, primary: String(item.title ?? item.courtName) };
    case "events":
      return { id: String(item.id), href: `/events/${item.slug}`, primary: String(item.title) };
    case "tournaments":
      return { id: String(item.id), href: `/tournaments/${item.slug}`, primary: String(item.name) };
    case "posts":
      return {
        id: String(item.id),
        href: `/community/${item.id}`,
        primary: String(item.content).slice(0, 70),
        secondary: String(item.authorName),
      };
    default:
      return { id: String(item.id), href: "/", primary: String(item.id) };
  }
}