import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/misc";
import { TournamentCreateForm } from "@/components/tournaments/create-form";

export const metadata: Metadata = {
  title: "Create a tournament",
  robots: { index: false, follow: false },
};

export default async function CreateTournamentPage() {
  const user = await requireUser().catch(() => redirect("/login?next=/organizer/tournaments/create"));
  if (!["ORGANIZER", "ADMIN"].includes(user.role)) redirect("/organizer/dashboard");

  const courts = await prisma.court.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });

  return (
    <Container className="py-8">
      <Breadcrumbs
        items={[
          { label: "Organizer", href: "/organizer/dashboard" },
          { label: "Create tournament" },
        ]}
      />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Create a tournament</h1>
      <p className="mt-1 text-ink-soft">
        It is created as a draft. Open registration when you are ready.
      </p>
      <div className="mt-6 max-w-3xl">
        <TournamentCreateForm courts={courts} />
      </div>
    </Container>
  );
}
