"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  AVAILABILITY_SLOTS,
  CITIES,
  CITY_LABELS,
  PLAY_FORMATS,
  POSITIONS,
  SKILL_LABELS,
  SKILL_LEVELS,
} from "@/lib/nepal";
import { useToast } from "@/components/providers/toast";
import { toggleFollowAction, startConversationAction } from "@/lib/social/actions";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export type PlayerCardData = {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  city: string;
  skillLevel: string | null;
  duprRating: number | null;
  formats: string[];
  position: string | null;
  availability: string[];
  isFollowing: boolean;
};

export function PlayerCard({ player }: { player: PlayerCardData }) {
  const { push } = useToast();
  const [following, setFollowing] = useState(player.isFollowing);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    setBusy(true);
    try {
      const result = await toggleFollowAction(player.userId);
      if (result.error) {
        push(result.error, "error");
      } else {
        setFollowing((current) => !current);
        if (result.success) push(result.success);
        router.refresh();
      }
    } catch (error) {
      push(error instanceof Error ? error.message : "Could not follow right now", "error");
    } finally {
      setBusy(false);
    }
  };

  const message = async () => {
    setBusy(true);
    try {
      await startConversationAction(player.userId);
    } catch (error) {
      push(error instanceof Error ? error.message : "Could not open messages", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface-raised p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={player.fullName} src={player.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <Link href={`/players/${player.username}`} className="truncate font-semibold text-ink hover:text-brand-800">
            {player.fullName}
          </Link>
          <p className="truncate text-xs text-ink-soft">
            @{player.username} · {cityLabel(player.city)}
          </p>
          <p className="mt-1 text-xs font-medium text-brand-700">
            {player.skillLevel ? skillLabel(player.skillLevel) : "Level not set"}
            {player.duprRating ? ` · DUPR ${player.duprRating.toFixed(2)}` : ""}
          </p>
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {player.formats.map((format) => (
          <span key={format} className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-800">
            {formatLabel(format)}
          </span>
        ))}
        {player.position ? (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
            {positionLabel(player.position)}
          </span>
        ) : null}
        {player.availability.slice(0, 2).map((slot) => (
          <span key={slot} className="rounded-full bg-accent-300/60 px-2 py-0.5 font-medium text-ink">
            {slotLabel(slot)}
          </span>
        ))}
      </dl>

      <div className="mt-4 flex gap-2 border-t border-line pt-3">
        <Button
          size="sm"
          variant={following ? "secondary" : "primary"}
          className="flex-1"
          disabled={busy}
          onClick={toggle}
        >
          {following ? "Following" : "Follow"}
        </Button>
        <Button size="sm" variant="ghost" className="flex-1" disabled={busy} onClick={message}>
          Message
        </Button>
      </div>
    </article>
  );
}

export function PlayerFilters() {
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

  const hasFilters = ["city", "skill", "format", "position", "availability", "dupr", "q"].some((k) => params.get(k));

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
            placeholder="Name or username"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
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
        <Field label="Skill level">
          <select value={get("skill")} onChange={(e) => update("skill", e.target.value)} className={selectClass}>
            <option value="">Any level</option>
            {SKILL_LEVELS.map((skill) => (
              <option key={skill.value} value={skill.value}>{skill.label}</option>
            ))}
          </select>
        </Field>
        <Field label="DUPR rating">
          <select value={get("dupr")} onChange={(e) => update("dupr", e.target.value)} className={selectClass}>
            <option value="">Any rating</option>
            <option value="2-2.99">2.00 – 2.99</option>
            <option value="3-3.49">3.00 – 3.49</option>
            <option value="3.5-3.99">3.50 – 3.99</option>
            <option value="4-5.5">4.00 and above</option>
          </select>
        </Field>
        <Field label="Format">
          <select value={get("format")} onChange={(e) => update("format", e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {PLAY_FORMATS.map((format) => (
              <option key={format.value} value={format.value}>{format.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Position">
          <select value={get("position")} onChange={(e) => update("position", e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {POSITIONS.map((position) => (
              <option key={position.value} value={position.value}>{position.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Availability">
          <select value={get("availability")} onChange={(e) => update("availability", e.target.value)} className={selectClass}>
            <option value="">Any</option>
            {AVAILABILITY_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>{slot.label}</option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

const selectClass = "w-full rounded-xl border border-line px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</label>
      {children}
    </div>
  );
}

function cityLabel(value: string) {
  return CITY_LABELS[value] ?? value;
}
function skillLabel(value: string) {
  return SKILL_LABELS[value] ?? value;
}
function formatLabel(value: string) {
  return { SINGLES: "Singles", DOUBLES: "Doubles", BOTH: "Both" }[value] ?? value;
}
function positionLabel(value: string) {
  return { LEFT: "Left", RIGHT: "Right", EITHER: "Either" }[value] ?? value;
}
function slotLabel(value: string) {
  return AVAILABILITY_SLOTS.find((s) => s.value === value)?.label ?? value;
}