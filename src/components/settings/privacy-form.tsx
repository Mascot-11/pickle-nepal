"use client";

import { useActionState } from "react";
import { updatePrivacyAction, type SettingsState } from "@/lib/settings/actions";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/form";

export function PrivacySettingsForm({
  defaults,
}: {
  defaults: { visibility: string; showDOB: boolean };
}) {
  const [state, formAction, pending] = useActionState(updatePrivacyAction, {} as SettingsState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {state.success}
        </p>
      ) : null}

      <RadioGroup
        legend="Who can see your profile"
        name="visibility"
        defaultValue={defaults.visibility}
        options={[
          { value: "PUBLIC", label: "Public", description: "Anyone can view your profile, stats and badges." },
          { value: "COMMUNITY_ONLY", label: "Community only", description: "Only signed-in PickleNepal members." },
          { value: "PRIVATE", label: "Private", description: "Only you can see your profile." },
        ]}
      />

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-sm">
        <input type="checkbox" name="showDOB" defaultChecked={defaults.showDOB} className="mt-0.5 h-4 w-4 accent-brand-700" />
        <span>
          <span className="block font-medium text-ink">Show my date of birth</span>
          <span className="block text-xs text-ink-soft">Off by default. Your age is never inferred publicly.</span>
        </span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save privacy settings"}
      </Button>
    </form>
  );
}