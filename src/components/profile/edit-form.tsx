"use client";

import { useActionState } from "react";
import { updateProfileAction, type SettingsState } from "@/lib/settings/actions";
import { Button } from "@/components/ui/button";
import { CheckboxGroup, Field, RadioGroup, Select, TextArea } from "@/components/ui/form";
import {
  AVAILABILITY_SLOTS,
  CITIES,
  FREQUENCIES,
  PLAY_FORMATS,
  POSITIONS,
  SKILL_LEVELS,
} from "@/lib/nepal";

type Defaults = {
  fullName: string;
  username: string;
  phone: string;
  city: string;
  bio: string | null;
  skillLevel: string | null;
  duprRating: number | null;
  formats: string[];
  position: string | null;
  availability: string[];
  frequency: string | null;
  instagram: string | null;
  avatarUrl: string | null;
  visibility: string;
};

export function ProfileEditForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, {} as SettingsState);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-line bg-surface-raised p-6">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="fullName" defaultValue={defaults.fullName} required />
        <Field label="Username" name="username" defaultValue={defaults.username} required />
        <Field
          label="Phone"
          name="phone"
          defaultValue={defaults.phone}
          required
          hint="Never shown publicly."
        />
        <Select
          label="City"
          name="city"
          defaultValue={defaults.city}
          required
          options={CITIES.map((c) => ({ value: c.value, label: c.label }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Profile photo URL" name="avatarUrl" defaultValue={defaults.avatarUrl ?? ""} type="url" />
        <Field label="Cover photo URL" name="coverUrl" type="url" />
      </div>

      <TextArea label="Bio" name="bio" defaultValue={defaults.bio ?? undefined} maxLength={600} rows={3} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Skill level"
          name="skillLevel"
          defaultValue={defaults.skillLevel ?? ""}
          placeholder="Not set"
          options={SKILL_LEVELS.map((s) => ({ value: s.value, label: s.label }))}
        />
        <Field
          label="DUPR rating"
          name="duprRating"
          type="number"
          min={2}
          max={5.5}
          step={0.01}
          defaultValue={defaults.duprRating ?? undefined}
          hint="Only enter a rating you were given."
        />
      </div>

      <RadioGroup
        legend="Preferred side"
        name="position"
        defaultValue={defaults.position ?? undefined}
        options={POSITIONS.map((p) => ({ value: p.value, label: p.label }))}
      />

      <CheckboxGroup
        legend="Preferred formats"
        name="preferredFormats"
        columns={3}
        defaultValues={defaults.formats}
        options={PLAY_FORMATS.map((f) => ({ value: f.value, label: f.label }))}
      />

      <CheckboxGroup
        legend="Availability"
        name="availability"
        columns={3}
        defaultValues={defaults.availability}
        options={AVAILABILITY_SLOTS.map((s) => ({ value: s.value, label: s.label }))}
      />

      <RadioGroup
        legend="How often do you play?"
        name="frequency"
        defaultValue={defaults.frequency ?? undefined}
        options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instagram" name="instagram" defaultValue={defaults.instagram ?? undefined} />
        <Select
          label="Profile visibility"
          name="visibility"
          defaultValue={defaults.visibility}
          options={[
            { value: "PUBLIC", label: "Public" },
            { value: "COMMUNITY_ONLY", label: "Community only" },
            { value: "PRIVATE", label: "Private" },
          ]}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}