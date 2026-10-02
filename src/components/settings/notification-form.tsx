"use client";

import { useActionState } from "react";
import { updateNotificationPreferencesAction, type SettingsState } from "@/lib/settings/actions";
import { Button } from "@/components/ui/button";

type Prefs = {
  gameInApp: boolean;
  gameEmail: boolean;
  tournamentInApp: boolean;
  tournamentEmail: boolean;
  eventInApp: boolean;
  eventEmail: boolean;
  socialInApp: boolean;
  socialEmail: boolean;
  messageInApp: boolean;
  messageEmail: boolean;
  marketingEmail: boolean;
  pushEnabled: boolean;
};

const GROUPS: Array<{ title: string; keys: Array<[keyof Prefs, string]> }> = [
  {
    title: "Games",
    keys: [
      ["gameInApp", "In-app: joins, leaves, reminders, cancellations"],
      ["gameEmail", "Email digest of game updates"],
    ],
  },
  {
    title: "Tournaments",
    keys: [
      ["tournamentInApp", "In-app: registration and draw updates"],
      ["tournamentEmail", "Email: registration confirmations and reminders"],
    ],
  },
  {
    title: "Events",
    keys: [
      ["eventInApp", "In-app: event reminders"],
      ["eventEmail", "Email: event reminders"],
    ],
  },
  {
    title: "Social",
    keys: [
      ["socialInApp", "In-app: likes, comments, follows, badges"],
      ["socialEmail", "Email: social activity"],
    ],
  },
  {
    title: "Messages",
    keys: [
      ["messageInApp", "In-app: new messages"],
      ["messageEmail", "Email: new messages"],
    ],
  },
  {
    title: "Other",
    keys: [
      ["marketingEmail", "Email: product news and announcements"],
      ["pushEnabled", "Browser push notifications"],
    ],
  },
];

export function NotificationPreferencesForm({ defaults }: { defaults: Prefs }) {
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferencesAction,
    {} as SettingsState,
  );

  return (
    <form action={formAction} className="space-y-6">
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

      {GROUPS.map((group) => (
        <fieldset key={group.title}>
          <legend className="text-sm font-semibold text-ink">{group.title}</legend>
          <div className="mt-2 space-y-2">
            {group.keys.map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface p-3 text-sm"
              >
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={defaults[key]}
                  className="h-4 w-4 accent-brand-700"
                />
                <span className="text-ink">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}