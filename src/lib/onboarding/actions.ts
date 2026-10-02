"use server";

/**
 * Onboarding (REQUIREMENT.md §10). Progress is saved after each step so a user
 * can leave and come back. City is written to both User (for filtering) and
 * PlayerProfile (for the public profile).
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/permissions";
import { onboardingSchema } from "@/lib/validation";
import { track } from "@/lib/analytics";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function firstError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): OnboardingState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: Object.values(fieldErrors)[0]?.[0] ?? "Please check your answers.", fieldErrors };
}

function readMulti(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String).filter(Boolean);
}

/** Step 1 — city. */
export async function saveOnboardingLocationAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse({ city: formData.get("city") });
  if (!parsed.success || !parsed.data.city) return { error: "Choose your city." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { city: parsed.data.city as never } }),
    prisma.playerProfile.update({
      where: { userId: user.id },
      data: { favoriteCity: parsed.data.city as never, onboardingStep: 2 },
    }),
  ]);

  revalidatePath("/onboarding");
  redirect("/onboarding/step/2");
}

/** Step 2 — skill level. */
export async function saveOnboardingSkillAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse({ skillLevel: formData.get("skillLevel") });
  if (!parsed.success || !parsed.data.skillLevel) return { error: "Choose your skill level." };

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { skillLevel: parsed.data.skillLevel as never, onboardingStep: 3 },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding/step/3");
}

/** Step 3 — format. */
export async function saveOnboardingFormatAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const formats = readMulti(formData, "preferredFormats");
  if (formats.length === 0) return { error: "Choose at least one format." };

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { preferredFormats: formats as never, onboardingStep: 4 },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding/step/4");
}

/** Step 4 — position. */
export async function saveOnboardingPositionAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse({ position: formData.get("position") });
  if (!parsed.success || !parsed.data.position) return { error: "Choose a position." };

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { position: parsed.data.position as never, onboardingStep: 5 },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding/step/5");
}

/** Step 5 — availability. */
export async function saveOnboardingAvailabilityAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const availability = readMulti(formData, "availability");
  if (availability.length === 0) return { error: "Choose at least one time slot." };

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { availability: availability as never, onboardingStep: 6 },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding/step/6");
}

/** Step 6 — frequency + optional extras. Completes onboarding. */
export async function saveOnboardingFrequencyAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse({
    frequency: formData.get("frequency"),
    duprRating: formData.get("duprRating") || undefined,
    bio: formData.get("bio") || undefined,
    instagram: formData.get("instagram") || undefined,
    facebook: formData.get("facebook") || undefined,
  });
  if (!parsed.success) return firstError(parsed.error);
  if (!parsed.data.frequency) return { error: "Choose how often you play." };

  const data = parsed.data;
  await prisma.$transaction([
    prisma.playerProfile.update({
      where: { userId: user.id },
      data: {
        frequency: data.frequency as never,
        duprRating: data.duprRating ?? null,
        bio: data.bio ?? null,
        instagram: data.instagram ?? null,
        facebook: data.facebook ?? null,
        onboardingStep: 6,
      },
    }),
    prisma.user.update({ where: { id: user.id }, data: { isOnboarded: true } }),
  ]);

  await track({ name: "PROFILE_COMPLETED", userId: user.id });
  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=1");
}