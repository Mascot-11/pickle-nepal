"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GAME_TYPES, CITIES, PLAY_FORMATS, SKILL_LEVELS } from "@/lib/nepal";
import { addDaysToNepalDate, toNepalParts } from "@/lib/dates";

/**
 * Filters are reflected in URL query parameters (§19) so links are shareable and
 * the back button behaves.
 */
export function GameFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const get = (key: string) => params.get(key) ?? "";

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const clearAll = () => router.push(pathname);

  const today = toNepalParts(new Date()).date;
  const tomorrow = addDaysToNepalDate(today, 1);
  const activeQuick = get("quick");

  const hasFilters =
    ["city", "skill", "format", "type", "price", "sort", "q", "court", "indoorOutdoor", "quick"].some((k) =>
      params.get(k),
    ) ||
    params.get("date") !== null;

  const quickButtons = [
    { key: "today", label: "Today", date: today },
    { key: "tomorrow", label: "Tomorrow", date: tomorrow },
    { key: "weekend", label: "This Weekend", date: null },
    { key: "beginner", label: "Beginner Friendly", date: null },
    { key: "free", label: "Free", date: null },
  ];

  const applyQuick = (key: string) => {
    if (activeQuick === key) {
      const next = new URLSearchParams(params.toString());
      next.delete("quick");
      next.delete("date");
      router.push(`${pathname}?${next.toString()}`);
      return;
    }
    const next = new URLSearchParams();
    for (const existing of params.keys()) {
      if (["quick", "date", "skill", "price"].includes(existing)) continue;
      next.set(existing, params.get(existing) ?? "");
    }
    next.set("quick", key);

    if (key === "today" || key === "tomorrow") next.set("date", key === "today" ? today : tomorrow);
    if (key === "beginner") next.set("skill", "BEGINNER");
    if (key === "free") next.set("price", "free");
    if (key === "weekend") next.delete("date");

    router.push(`${pathname}?${next.toString()}`);
  };

  const setWeekend = () => {
    const next = new URLSearchParams(params.toString());
    next.set("quick", "weekend");
    next.delete("date");
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">Filters</h2>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {quickButtons.map((button) => {
          const isActive =
            activeQuick === button.key ||
            (button.key === "today" && params.get("date") === today) ||
            (button.key === "tomorrow" && params.get("date") === tomorrow);
          return (
            <button
              key={button.key}
              type="button"
              onClick={() => (button.key === "weekend" ? setWeekend() : applyQuick(button.key))}
              aria-pressed={isActive}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-line text-ink-soft hover:border-brand-400 hover:bg-brand-50"
              }`}
            >
              {button.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 w-full rounded-xl border border-line py-2 text-sm font-semibold text-ink lg:hidden"
      >
        {open ? "Hide filters" : "More filters"}
      </button>

      <div className={`${open ? "mt-4 block" : "hidden"} space-y-4 lg:mt-4 lg:block`}>
        <FilterField label="Search">
          <input
            type="search"
            defaultValue={get("q")}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Court or keyword"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
        </FilterField>

        <FilterField label="City">
          <select
            value={get("city")}
            onChange={(e) => update("city", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            <option value="">All cities</option>
            {CITIES.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Date">
          <input
            type="date"
            value={params.get("date") ?? ""}
            onChange={(e) => update("date", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
        </FilterField>

        <FilterField label="Skill level">
          <select
            value={get("skill")}
            onChange={(e) => update("skill", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            <option value="">Any level</option>
            {SKILL_LEVELS.map((skill) => (
              <option key={skill.value} value={skill.value}>
                {skill.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Game type">
          <select
            value={get("type")}
            onChange={(e) => update("type", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            <option value="">Any type</option>
            {GAME_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Format">
          <select
            value={get("format")}
            onChange={(e) => update("format", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            <option value="">Any format</option>
            {PLAY_FORMATS.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Price">
          <select
            value={get("price")}
            onChange={(e) => update("price", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            <option value="">Any price</option>
            <option value="free">Free only</option>
            <option value="paid">Paid games</option>
          </select>
        </FilterField>

        <FilterField label="Indoor / outdoor">
          <select
            value={get("indoorOutdoor")}
            onChange={(e) => update("indoorOutdoor", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            <option value="INDOOR">Indoor</option>
            <option value="OUTDOOR">Outdoor</option>
          </select>
        </FilterField>

        <FilterField label="Sort by">
          <select
            value={get("sort")}
            onChange={(e) => update("sort", e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            <option value="">Soonest first</option>
            <option value="newest">Newest</option>
            <option value="players">Most players</option>
          </select>
        </FilterField>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}