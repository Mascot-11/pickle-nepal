"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createGameAction, type GameActionState } from "@/lib/games/actions";
import { GAME_TYPES, SKILL_LEVELS } from "@/lib/nepal";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, RadioGroup, TextArea } from "@/components/ui/form";
import { SmartImage } from "@/components/ui/smart-image";
import { DEFAULT_CAPACITIES } from "@/lib/games/rules";
import { toNepalParts } from "@/lib/dates";

type Court = {
  id: string;
  name: string;
  slug: string;
  city: string;
  images: string[];
  indoorOutdoor: string;
  surface: string;
  pricePerHour: number | null;
  address: string | null;
};

const STEPS = [
  { number: 1, label: "When" },
  { number: 2, label: "Where" },
  { number: 3, label: "Type" },
  { number: 4, label: "Skill" },
  { number: 5, label: "Players" },
  { number: 6, label: "Details" },
  { number: 7, label: "Review" },
] as const;

export function GameWizard({ step, courts }: { step: number; courts: Court[] }) {
  const today = toNepalParts(new Date()).date;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/games" className="text-sm text-ink-soft hover:underline">
        ← Back to games
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Create a game</h1>
      <p className="mt-1 text-ink-soft">
        Seven short steps. You can save a draft and publish later.
      </p>

      <ol className="my-6 flex flex-wrap items-center gap-2" aria-label="Create game progress">
        {STEPS.map((entry) => (
          <li key={entry.number} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                entry.number < step
                  ? "bg-brand-600 text-white"
                  : entry.number === step
                    ? "bg-brand-700 text-white"
                    : "bg-line text-ink-soft"
              }`}
            >
              {entry.number < step ? "✓" : entry.number}
            </span>
            <span
              className={`text-xs font-medium ${entry.number === step ? "text-ink" : "text-ink-soft"}`}
            >
              {entry.label}
            </span>
          </li>
        ))}
      </ol>

      {courts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface-raised p-8 text-center">
          <p className="font-semibold text-ink">No courts are available yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            You need at least one court before you can publish a game.
          </p>
          <ButtonLink href="/courts" className="mt-4">
            Browse courts
          </ButtonLink>
        </div>
      ) : (
        <WizardForm step={step} courts={courts} today={today} />
      )}
    </div>
  );
}

function WizardForm({ step, courts, today }: { step: number; courts: Court[]; today: string }) {
  const [state, formAction, pending] = useActionState(createGameAction, {} as GameActionState);
  const [type, setType] = useState<string>("DOUBLES");
  const [courtId, setCourtId] = useState<string>(courts[0]?.id ?? "");
  const [skill, setSkill] = useState<string>("INTERMEDIATE");
  const [openToAll, setOpenToAll] = useState(false);
  const [capacity, setCapacity] = useState<string>(String(DEFAULT_CAPACITIES.DOUBLES));
  const [date, setDate] = useState<string>(today);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("19:00");

  const selectedCourt = courts.find((c) => c.id === courtId);
  const query = new URLSearchParams({ step: String(Math.min(step + 1, 7)) }).toString();

  // The wizard renders one step at a time. Only the visible step's inputs are
  // submitted; hidden steps are carried in the URL so nothing is lost.
  const carry = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams({ step: String(Math.min(step + 1, 7)) });
    for (const [key, value] of Object.entries(overrides)) params.set(key, value);
    return `/games/create?${params.toString()}`;
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-line bg-surface-raised p-6">
        {step === 1 ? (
          <>
            <h2 className="text-lg font-semibold text-ink">When is your game?</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Times are Nepal local time (Asia/Kathmandu, UTC+05:45).
            </p>
            <div className="mt-5 space-y-4">
              <Field
                label="Date"
                name="date"
                type="date"
                required
                min={today}
                value={date}
                onChangeCustom={setDate}
                error={state.fieldErrors?.date?.[0]}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Start time"
                  name="startTime"
                  type="time"
                  required
                  defaultValue="17:00"
                  onChangeCustom={setStartTime}
                />
                <Field
                  label="End time"
                  name="endTime"
                  type="time"
                  required
                  defaultValue="19:00"
                  error={state.fieldErrors?.endTime?.[0]}
                  onChangeCustom={setEndTime}
                />
              </div>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-lg font-semibold text-ink">Which court?</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Pick a court you have access to. Booking availability is separate from hosting.
            </p>
            <input type="hidden" name="courtId" value={courtId} />
            <ul className="mt-4 grid max-h-[26rem] gap-2 overflow-y-auto sm:grid-cols-2">
              {courts.map((court) => (
                <li key={court.id}>
                  <label
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${
                      courtId === court.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-line bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="courtSelection"
                      value={court.id}
                      checked={courtId === court.id}
                      onChange={() => setCourtId(court.id)}
                      className="sr-only"
                    />
                    <SmartImage
                      src={court.images[0]}
                      alt={court.name}
                      className="h-14 w-20 rounded-lg"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{court.name}</span>
                      <span className="block text-xs text-ink-soft">
                        {court.city.replace(/_/g, " ")} ·{" "}
                        {court.indoorOutdoor === "INDOOR" ? "Indoor" : "Outdoor"}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {court.pricePerHour ? `NPR ${court.pricePerHour}/hr` : "No pricing"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="text-lg font-semibold text-ink">What kind of game?</h2>
            <div className="mt-4">
              <RadioGroup
                legend="Game type"
                name="type"
                required
                defaultValue="DOUBLES"
                options={GAME_TYPES.map((entry) => ({
                  value: entry.value,
                  label: entry.label,
                  description:
                    entry.defaultCapacity === 2
                      ? "Two players"
                      : entry.defaultCapacity === 4
                        ? "Four players"
                        : `${entry.defaultCapacity} players`,
                }))}
                onChangeCustom={(value) => {
                  setType(value);
                  setCapacity(String(DEFAULT_CAPACITIES[value] ?? 4));
                }}
              />
            </div>
            <input type="hidden" name="format" value={type === "SINGLES" ? "SINGLES" : type === "DOUBLES" ? "DOUBLES" : "BOTH"} />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2 className="text-lg font-semibold text-ink">What level are you playing at?</h2>
            <div className="mt-4 space-y-4">
              <RadioGroup
                legend="Skill level"
                name="skillLevel"
                required
                defaultValue="INTERMEDIATE"
                options={SKILL_LEVELS.map((entry) => ({ value: entry.value, label: entry.label }))}
                onChangeCustom={setSkill}
              />
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface p-3 text-sm has-checked:border-brand-500 has-checked:bg-brand-50">
                <input
                  type="checkbox"
                  name="skillOpenToAll"
                  checked={openToAll}
                  onChange={(e) => setOpenToAll(e.target.checked)}
                  className="h-4 w-4 accent-brand-700"
                />
                <span>
                  <span className="block font-semibold text-ink">Open to all levels</span>
                  <span className="block text-xs text-ink-soft">
                    Anyone can join regardless of the level above.
                  </span>
                </span>
              </label>
            </div>
            {!openToAll ? <input type="hidden" name="skillLevel" value={skill} /> : null}
          </>
        ) : null}

        {step === 5 ? (
          <>
            <h2 className="text-lg font-semibold text-ink">How many players?</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Capacity includes you. {GAME_TYPES.find((t) => t.value === type)?.label} usually fits{" "}
              {DEFAULT_CAPACITIES[type] ?? 4}.
            </p>
            <div className="mt-4 space-y-4">
              <Field
                label="Total players"
                name="capacity"
                type="number"
                min={2}
                max={24}
                required
                value={capacity}
                onChangeCustom={setCapacity}
                hint="Between 2 and 24."
              />
              <Field
                label="Price per person (NPR)"
                name="pricePerPerson"
                type="number"
                min={0}
                max={100000}
                placeholder="Leave blank for free"
                hint="Optional. Leave blank and the game is listed as free."
              />
              <p className="rounded-xl border border-line bg-surface p-3 text-sm text-ink-soft">
                Players can join a waitlist when this game fills up, and we offer the spot to the
                next person when someone leaves.
              </p>
              <input type="hidden" name="waitlistEnabled" value="on" />
            </div>
          </>
        ) : null}

        {step === 6 ? (
          <>
            <h2 className="text-lg font-semibold text-ink">Anything else players should know?</h2>
            <p className="mt-1 text-sm text-ink-soft">All of these are optional.</p>
            <div className="mt-4 space-y-4">
              <Field label="Title" name="title" placeholder="Tuesday evening doubles — all welcome" maxLength={100} />
              <TextArea
                label="Description"
                name="description"
                rows={3}
                maxLength={1000}
                placeholder="What to expect, how long, what to bring."
              />
              <Field label="Ball information" name="ballInfo" placeholder="Demo balls provided" maxLength={200} />
              <Field
                label="Equipment information"
                name="equipmentInfo"
                placeholder="Bring your own paddle or rent one"
                maxLength={200}
              />
              <TextArea
                label="Note for players"
                name="organizerNote"
                rows={2}
                maxLength={500}
                placeholder="Meet by the front desk at 6:45."
              />
            </div>
          </>
        ) : null}

        {step === 7 ? (
          <>
            <h2 className="text-lg font-semibold text-ink">Review your game</h2>
            <dl className="mt-4 divide-y divide-line rounded-xl border border-line">
              <ReviewRow label="When" value={`${date} · ${startTime} – ${endTime}`} />
              <ReviewRow label="Court" value={selectedCourt ? `${selectedCourt.name} (${selectedCourt.city.replace(/_/g, " ")})` : "—"} />
              <ReviewRow label="Type" value={GAME_TYPES.find((t) => t.value === type)?.label ?? type} />
              <ReviewRow label="Level" value={openToAll ? "Open to all levels" : (SKILL_LEVELS.find((s) => s.value === skill)?.label ?? skill)} />
              <ReviewRow label="Players" value={`${capacity} max`} />
            </dl>
            <p className="mt-4 text-sm text-ink-soft">
              Fill in any missing details on the previous steps, then publish.
            </p>
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface p-3 text-sm">
              <input type="checkbox" name="publish" defaultChecked className="h-4 w-4 accent-brand-700" />
              <span>
                <span className="block font-semibold text-ink">Publish immediately</span>
                <span className="block text-xs text-ink-soft">
                  Uncheck to save as a draft only you can see.
                </span>
              </span>
            </label>
          </>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
          {step > 1 ? (
            <Link href={carryBack(step)} className="text-sm font-medium text-ink-soft hover:underline">
              ← Back
            </Link>
          ) : (
            <Link href="/games" className="text-sm font-medium text-ink-soft hover:underline">
              Cancel
            </Link>
          )}

          {step < 7 ? (
            <ButtonLink href={carry()} variant="secondary">
              Continue
            </ButtonLink>
          ) : (
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Publishing…" : "Publish Game"}
            </Button>
          )}
        </div>
      </div>

      {/* Carry earlier answers forward so the final submit has everything. */}
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="startTime" value={startTime} />
      <input type="hidden" name="endTime" value={endTime} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="capacity" value={capacity} />
      {openToAll ? <input type="hidden" name="skillOpenToAll" value="true" /> : null}
      <p className="sr-only">Step {step}</p>
      <span className="sr-only">{query}</span>
    </form>
  );
}

function carryBack(step: number): string {
  return `/games/create?step=${Math.max(1, step - 1)}`;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-sm font-medium text-ink-soft">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}