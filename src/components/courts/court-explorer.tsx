"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AMENITIES, CITIES } from "@/lib/nepal";

const selectClass = "w-full rounded-xl border border-line px-3 py-2 text-sm";

export function CourtMapToggle({ current }: { current: "list" | "map" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (view: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("view", view);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="View mode">
      <button
        type="button"
        onClick={() => set("list")}
        aria-pressed={current === "list"}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
          current === "list" ? "bg-brand-700 text-white" : "text-ink-soft"
        }`}
      >
        List
      </button>
      <button
        type="button"
        onClick={() => set("map")}
        aria-pressed={current === "map"}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
          current === "map" ? "bg-brand-700 text-white" : "text-ink-soft"
        }`}
      >
        Map
      </button>
    </div>
  );
}

export function CourtFilters() {
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

  const hasFilters = ["city", "indoorOutdoor", "surface", "amenity", "minPrice", "maxPrice", "sort", "q"].some(
    (key) => params.get(key),
  );

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Filters</h2>
        {hasFilters ? (
          <button type="button" onClick={() => router.push(pathname)} className="text-xs font-semibold text-brand-700 hover:underline">
            Clear all
          </button>
        ) : null}
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
        <Field label="Search">
          <input
            type="search"
            value={get("q")}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Court name or area"
            className={selectClass}
          />
        </Field>
        <Field label="City">
          <select value={get("city")} onChange={(e) => update("city", e.target.value)} className={selectClass}>
            <option value="">All cities</option>
            {CITIES.map((city) => (
              <option key={city.value} value={city.value}>{city.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Indoor / outdoor">
          <select value={get("indoorOutdoor")} onChange={(e) => update("indoorOutdoor", e.target.value)} className={selectClass}>
            <option value="">Any</option>
            <option value="INDOOR">Indoor</option>
            <option value="OUTDOOR">Outdoor</option>
          </select>
        </Field>
        <Field label="Surface">
          <select value={get("surface")} onChange={(e) => update("surface", e.target.value)} className={selectClass}>
            <option value="">Any</option>
            <option value="ACRYLIC">Acrylic</option>
            <option value="CONCRETE">Concrete</option>
            <option value="ASPHALT">Asphalt</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Amenity">
          <select value={get("amenity")} onChange={(e) => update("amenity", e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {AMENITIES.map((amenity) => (
              <option key={amenity} value={amenity}>{amenity}</option>
            ))}
          </select>
        </Field>
        <Field label="Price per hour (NPR)">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={get("minPrice")}
              onChange={(e) => update("minPrice", e.target.value)}
              className={selectClass}
            />
            <input
              type="number"
              min={0}
              placeholder="Max"
              value={get("maxPrice")}
              onChange={(e) => update("maxPrice", e.target.value)}
              className={selectClass}
            />
          </div>
        </Field>
        <Field label="Sort by">
          <select value={get("sort")} onChange={(e) => update("sort", e.target.value)} className={selectClass}>
            <option value="">Most viewed</option>
            <option value="name">Name</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

export type MapCourt = {
  id: string;
  slug: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  pricePerHour: number | null;
  images: string[];
  indoorOutdoor: string;
  rating: number;
};

/**
 * Map view (§23). Uses Leaflet via CDN-free inline SVG projection so it works
 * without an API key; GPS is never required — manual city selection is the
 * primary path.
 */
export function CourtMapView({ courts }: { courts: MapCourt[] }) {
  const [selected, setSelected] = useState<MapCourt | null>(null);

  const located = courts.filter((c) => c.latitude !== null && c.longitude !== null);

  if (located.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface-raised p-10 text-center">
        <p className="font-semibold text-ink">No mapped courts in this view</p>
        <p className="mt-1 text-sm text-ink-soft">
          Switch to the list view, or pick a different city — many Nepal courts have not added map
          coordinates yet.
        </p>
      </div>
    );
  }

  const lats = located.map((c) => c.latitude!);
  const lngs = located.map((c) => c.longitude!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.02;

  const project = (lat: number, lng: number) => {
    const x = ((lng - (minLng - pad)) / (maxLng - minLng + pad * 2)) * 100;
    const y = 100 - ((lat - (minLat - pad)) / (maxLat - minLat + pad * 2)) * 100;
    return { x: Math.min(96, Math.max(4, x)), y: Math.min(94, Math.max(6, y)) };
  };

  return (
    <div className="space-y-4">
      <div
        className="relative h-96 w-full overflow-hidden rounded-2xl border border-line bg-brand-50"
        role="img"
        aria-label={`Map of ${located.length} courts`}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>

        {located.map((court) => {
          const point = project(court.latitude!, court.longitude!);
          const active = selected?.id === court.id;
          return (
            <button
              key={court.id}
              type="button"
              onClick={() => setSelected(court)}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-full rounded-full px-2.5 py-1 text-xs font-bold shadow-md transition-transform ${
                active ? "z-10 scale-110 bg-accent-600 text-ink" : "bg-brand-700 text-white"
              }`}
              aria-label={`${court.name}, ${court.city}`}
            >
              🏓
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="rounded-2xl border border-brand-300 bg-brand-50 p-4">
          <h3 className="font-semibold text-ink">{selected.name}</h3>
          <p className="text-sm text-ink-soft">
            {selected.city.replace(/_/g, " ")} · {selected.indoorOutdoor === "INDOOR" ? "Indoor" : "Outdoor"}
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-800">
            {selected.pricePerHour ? `NPR ${selected.pricePerHour}/hour` : "Pricing on request"}
          </p>
          <a
            href={`/courts/${selected.slug}`}
            className="mt-3 inline-block rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            View Court
          </a>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Tap a marker to see court details.</p>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {located.map((court) => (
          <li key={court.id}>
            <a
              href={`/courts/${court.slug}`}
              className="block rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm hover:border-brand-300"
            >
              <span className="font-medium text-ink">{court.name}</span>
              <span className="block text-xs text-ink-soft">
                {court.city.replace(/_/g, " ")} ·{" "}
                {court.pricePerHour ? `NPR ${court.pricePerHour}/hr` : "Pricing on request"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</label>
      {children}
    </div>
  );
}