"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckboxGroup, Field, RadioGroup, Select, TextArea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  AVAILABILITY_SLOTS,
  CITIES,
  FREQUENCIES,
  PLAY_FORMATS,
  POSITIONS,
  SKILL_LEVELS,
} from "@/lib/nepal";
import {
  saveOnboardingAvailabilityAction,
  saveOnboardingFormatAction,
  saveOnboardingFrequencyAction,
  saveOnboardingLocationAction,
  saveOnboardingPositionAction,
  saveOnboardingSkillAction,
  type OnboardingState,
} from "@/lib/onboarding/actions";

type ProfileData = {
  favoriteCity: string | null;
  skillLevel: string | null;
  preferredFormats: string[];
  position: string | null;
  availability: string[];
  frequency: string | null;
  duprRating: number | null;
  bio: string | null;
  instagram: string | null;
  facebook: string | null;
  onboardingStep: number;
};

const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Where do you play?", subtitle: "Pick your city. We will show games, courts and players near you." },
  2: { title: "How do you play?", subtitle: "Be honest about your level — it helps everyone have a good game." },
  3: { title: "What format?", subtitle: "Singles, doubles, or both." },
  4: { title: "Which side do you play?", subtitle: "If you are still learning, choose Either." },
  5: { title: "When are you usually free?", subtitle: "Choose every slot that works for you." },
  6: { title: "How often do you play?", subtitle: "Last step. You can skip everything except frequency." },
};

const ACTIONS = [
  saveOnboardingLocationAction,
  saveOnboardingSkillAction,
  saveOnboardingFormatAction,
  saveOnboardingPositionAction,
  saveOnboardingAvailabilityAction,
  saveOnboardingFrequencyAction,
];

export function OnboardingWizard({
  step,
  profile,
  userCity,
}: {
  step: number;
  profile?: ProfileData | null;
  userCity?: string;
}) {
  const action = ACTIONS[step - 1];
  const [state, formAction, pending] = useActionState(action, {} as OnboardingState);
  const copy = STEP_TITLES[step];

  return (
    <div className="py-10 sm:py-14">
      <Container className="max-w-2xl">
        <ol className="mb-8 flex items-center gap-2" aria-label="Onboarding progress">
          {Object.keys(STEP_TITLES).map((key) => {
            const number = Number(key);
            const done = number < step;
            const current = number === step;
            return (
              <li key={number} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-brand-600 text-white"
                      : current
                        ? "bg-brand-700 text-white"
                        : "bg-line text-ink-soft"
                  }`}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? "✓" : number}
                </span>
                {number < 6 ? (
                  <span className={`h-0.5 flex-1 ${done ? "bg-brand-500" : "bg-line"}`} aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{copy.title}</h1>
        <p className="mt-1 text-ink-soft">{copy.subtitle}</p>

        <form action={formAction} className="mt-8 space-y-6 rounded-2xl border border-line bg-surface-raised p-6">
          {state.error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {state.error}
            </p>
          ) : null}

          {step === 1 ? (
            <Select
              label="City"
              name="city"
              required
              defaultValue={profile?.favoriteCity ?? userCity ?? "KATHMANDU"}
              options={CITIES.map((city) => ({ value: city.value, label: city.label }))}
              hint="No GPS needed. You can change this later."
            />
          ) : null}

          {step === 2 ? (
            <RadioGroup
              legend="Skill level"
              name="skillLevel"
              required
              defaultValue={profile?.skillLevel ?? undefined}
              options={SKILL_LEVELS.map((skill) => ({ value: skill.value, label: skill.label }))}
            />
          ) : null}

          {step === 3 ? (
            <CheckboxGroup
              legend="Preferred formats"
              name="preferredFormats"
              columns={1}
              defaultValues={profile?.preferredFormats ?? []}
              options={PLAY_FORMATS.map((format) => ({
                value: format.value,
                label: format.label,
                description:
                  format.value === "SINGLES"
                    ? "One versus one"
                    : format.value === "DOUBLES"
                      ? "Two versus two"
                      : "Happy with either",
              }))}
            />
          ) : null}

          {step === 4 ? (
            <RadioGroup
              legend="Preferred side"
              name="position"
              required
              defaultValue={profile?.position ?? undefined}
              options={POSITIONS.map((position) => ({
                value: position.value,
                label: position.label,
                description:
                  position.value === "LEFT"
                    ? "Forehand side"
                    : position.value === "RIGHT"
                      ? "Backhand side"
                      : "No preference",
              }))}
            />
          ) : null}

          {step === 5 ? (
            <CheckboxGroup
              legend="Availability"
              name="availability"
              columns={2}
              defaultValues={profile?.availability ?? []}
              options={AVAILABILITY_SLOTS.map((slot) => ({ value: slot.value, label: slot.label }))}
            />
          ) : null}

          {step === 6 ? (
            <>
              <RadioGroup
                legend="How often do you play?"
                name="frequency"
                required
                defaultValue={profile?.frequency ?? undefined}
                options={FREQUENCIES.map((frequency) => ({ value: frequency.value, label: frequency.label }))}
              />

              <details className="rounded-xl border border-line bg-surface p-4">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  Optional extras
                </summary>
                <div className="mt-4 space-y-4">
                  <Field
                    label="DUPR rating"
                    name="duprRating"
                    type="number"
                    inputMode="decimal"
                    min={2}
                    max={5.5}
                    step={0.01}
                    defaultValue={profile?.duprRating ?? undefined}
                    hint="Only enter a rating you have been given. We never estimate one."
                  />
                  <TextArea
                    label="Short bio"
                    name="bio"
                    defaultValue={profile?.bio ?? undefined}
                    maxLength={600}
                    rows={3}
                    placeholder="Where you play, what you are working on, how to find you."
                  />
                  <Field label="Instagram" name="instagram" defaultValue={profile?.instagram ?? undefined} />
                  <Field label="Facebook profile URL" name="facebook" defaultValue={profile?.facebook ?? undefined} />
                </div>
              </details>
            </>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 1 ? (
              <Link href={`/onboarding/step/${step - 1}`} className="text-sm font-medium text-ink-soft hover:underline">
                ← Back
              </Link>
            ) : (
              <Link href="/profile" className="text-sm font-medium text-ink-soft hover:underline">
                Skip for now
              </Link>
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Saving…" : step === 6 ? "Finish setup" : "Continue"}
            </Button>
          </div>
        </form>
      </Container>
    </div>
  );
}