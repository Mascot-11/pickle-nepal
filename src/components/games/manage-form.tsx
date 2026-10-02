"use client";

import { useActionState } from "react";
import { updateGameAction, type GameActionState } from "@/lib/games/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/form";

export function GameManageForm({
  gameId,
  defaults,
}: {
  gameId: string;
  defaults: {
    title: string;
    description: string;
    capacity: number;
    pricePerPerson: number | null;
    ballInfo: string;
    equipmentInfo: string;
    organizerNote: string;
    waitlistEnabled: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<GameActionState, FormData>(
    (prev, formData) => updateGameAction(gameId, prev, formData),
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {state.success}
        </p>
      ) : null}

      <Field label="Title" name="title" defaultValue={defaults.title} maxLength={100} />
      <TextArea label="Description" name="description" defaultValue={defaults.description} rows={3} maxLength={1000} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Capacity"
          name="capacity"
          type="number"
          min={2}
          max={24}
          defaultValue={defaults.capacity}
          hint="Cannot go below the number of players already joined."
        />
        <Field
          label="Price per person (NPR)"
          name="pricePerPerson"
          type="number"
          min={0}
          defaultValue={defaults.pricePerPerson ?? undefined}
          placeholder="Blank = free"
        />
      </div>
      <Field label="Ball information" name="ballInfo" defaultValue={defaults.ballInfo} maxLength={200} />
      <Field label="Equipment information" name="equipmentInfo" defaultValue={defaults.equipmentInfo} maxLength={200} />
      <TextArea
        label="Note for players"
        name="organizerNote"
        defaultValue={defaults.organizerNote}
        rows={2}
        maxLength={500}
      />

      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface p-3 text-sm">
        <input
          type="checkbox"
          name="waitlistEnabled"
          value="on"
          defaultChecked={defaults.waitlistEnabled}
          className="h-4 w-4 accent-brand-700"
        />
        <span className="text-ink">Waitlist enabled</span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}