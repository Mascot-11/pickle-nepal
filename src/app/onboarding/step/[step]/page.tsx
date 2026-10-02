import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata: Metadata = {
  title: "Set up your player profile",
  robots: { index: false, follow: false },
};

const VALID_STEPS = [1, 2, 3, 4, 5, 6] as const;

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  if (user.isOnboarded) redirect("/dashboard");

  const { step: rawStep } = await params;
  const step = Number(rawStep);
  if (!VALID_STEPS.includes(step as (typeof VALID_STEPS)[number])) notFound();

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    select: {
      favoriteCity: true,
      skillLevel: true,
      preferredFormats: true,
      position: true,
      availability: true,
      frequency: true,
      duprRating: true,
      bio: true,
      instagram: true,
      facebook: true,
      onboardingStep: true,
    },
  });

  return <OnboardingWizard step={step} profile={profile} userCity={user.city} />;
}