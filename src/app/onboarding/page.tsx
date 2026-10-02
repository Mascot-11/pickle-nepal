import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata: Metadata = {
  title: "Set up your player profile",
  robots: { index: false, follow: false },
};

/** Onboarding entry point — routes to the first unfinished step. */
export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  if (user.isOnboarded) redirect("/dashboard");

  return <OnboardingWizard step={1} />;
}