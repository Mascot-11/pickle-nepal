"use client";

import { useActionState, useState } from "react";
import { createTournamentAction, type TournamentState } from "@/lib/tournaments/actions";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/form";
import { CITIES } from "@/lib/nepal";
import { toNepalParts, addDaysToNepalDate } from "@/lib/dates";

export function TournamentCreateForm({ courts }: { courts: Array<{ id: string; name: string; city: string }> }) {
  const [state, formAction, pending] = useActionState(createTournamentAction, {} as TournamentState);
  const today = toNepalParts(new Date()).date;
  const [categoryCount, setCategoryCount] = useState(2);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-line bg-surface-raised p-6">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Field label="Tournament name" name="name" required minLength={3} maxLength={140} />
      <TextArea label="Description" name="description" rows={3} maxLength={5000} />
      <TextArea label="Rules" name="rules" rows={4} maxLength={5000} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue" name="venue" required minLength={2} maxLength={200} />
        <Select
          label="City"
          name="city"
          required
          options={CITIES.map((c) => ({ value: c.value, label: c.label }))}
        />
      </div>

      <Select
        label="Court (optional)"
        name="courtId"
        placeholder="No specific court"
        options={courts.map((c) => ({ value: c.id, label: `${c.name} — ${c.city.replace(/_/g, " ")}` }))}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Start date" name="startDate" type="date" required min={today} defaultValue={addDaysToNepalDate(today, 30)} />
        <Field label="End date" name="endDate" type="date" required min={today} defaultValue={addDaysToNepalDate(today, 31)} />
        <Field
          label="Registration closes"
          name="registrationDeadline"
          type="date"
          required
          min={today}
          defaultValue={addDaysToNepalDate(today, 25)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Entry fee (NPR)" name="entryFee" type="number" min={0} defaultValue={0} />
        <Field label="Max participants" name="maxParticipants" type="number" min={4} max={512} />
        <Select
          label="Format"
          name="format"
          required
          defaultValue="SINGLE_ELIMINATION"
          options={[
            { value: "SINGLE_ELIMINATION", label: "Single elimination" },
            { value: "ROUND_ROBIN", label: "Round robin" },
            { value: "HYBRID", label: "Round robin + single elimination" },
          ]}
        />
      </div>

      <TextArea label="Prize information" name="prizeInfo" rows={2} maxLength={2000} />
      <Field label="Contact" name="contactInfo" maxLength={500} />
      <Field label="Poster image URL" name="posterUrl" type="url" />

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Categories</legend>
        <div className="mt-2 space-y-2">
          {Array.from({ length: categoryCount }).map((_, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_180px]">
              <input
                name="categoryName"
                placeholder={`Category ${index + 1} (e.g. Men's Doubles)`}
                required
                className="rounded-xl border border-line px-3 py-2 text-sm"
              />
              <select name="categoryFormat" className="rounded-xl border border-line px-3 py-2 text-sm">
                <option value="SINGLES">Singles</option>
                <option value="DOUBLES">Doubles</option>
              </select>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setCategoryCount((count) => Math.min(10, count + 1))}
        >
          + Add category
        </Button>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create draft tournament"}
      </Button>
    </form>
  );
}
