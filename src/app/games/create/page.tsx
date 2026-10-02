import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Create a game",
  robots: { index: false, follow: false },
};

/** Multi-step create flow (§14). Each step persists into the next. */
export default async function CreateGamePage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/games/create");

  const { step } = await searchParams;
  const currentStep = Number(step ?? "1") || 1;

  const courts = await prisma.court.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      images: true,
      indoorOutdoor: true,
      surface: true,
      pricePerHour: true,
      address: true,
    },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  const { GameWizard } = await import("@/components/games/game-wizard");

  return <GameWizard step={currentStep} courts={courts} />;
}