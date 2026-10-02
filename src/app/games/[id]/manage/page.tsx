import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { requireGameOwner } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/misc";
import { Badge, Card } from "@/components/ui/primitives";
import { GameManageForm } from "@/components/games/manage-form";
import { removeParticipantAction } from "@/lib/games/actions";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Manage game",
  robots: { index: false, follow: false },
};

export default async function ManageGamePage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  await requireGameOwner(id);

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { select: { id: true, fullName: true, username: true } } } },
      waitlist: { orderBy: { position: "asc" }, include: { user: { select: { id: true, fullName: true } } } },
    },
  });

  if (!game) notFound();

  return (
    <Container className="py-8">
      <Breadcrumbs
        items={[
          { label: "Games", href: "/games" },
          { label: game.title ?? "Game", href: `/games/${game.id}` },
          { label: "Manage" },
        ]}
      />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Manage your game</h1>
      <p className="mt-1 flex items-center gap-2 text-ink-soft">
        <Badge tone="neutral">{game.status.replace(/_/g, " ")}</Badge>
        {game.startsAt <= new Date() ? "This game has started and can no longer be edited." : null}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="font-semibold text-ink">Edit details</h2>
          <div className="mt-4">
            <GameManageForm
              gameId={game.id}
              defaults={{
                title: game.title ?? "",
                description: game.description ?? "",
                capacity: game.capacity,
                pricePerPerson: game.pricePerPerson,
                ballInfo: game.ballInfo ?? "",
                equipmentInfo: game.equipmentInfo ?? "",
                organizerNote: game.organizerNote ?? "",
                waitlistEnabled: game.waitlistEnabled,
              }}
            />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold text-ink">Players ({game.participants.length}/{game.capacity})</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {game.participants.map((participant) => (
                <li key={participant.id} className="flex items-center justify-between gap-2">
                  <span>
                    {participant.user.fullName}{" "}
                    {participant.role === "CREATOR" ? <Badge tone="accent">Organiser</Badge> : null}
                  </span>
                  {participant.role !== "CREATOR" ? (
                    <RemoveParticipantButton gameId={game.id} userId={participant.userId} />
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="font-semibold text-ink">Waitlist ({game.waitlist.length})</h2>
            <ol className="mt-3 space-y-1 text-sm text-ink-soft">
              {game.waitlist.map((entry) => (
                <li key={entry.id}>
                  {entry.position}. {entry.user.fullName} — {entry.status.replace(/_/g, " ")}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </Container>
  );
}



function RemoveParticipantButton({ gameId, userId }: { gameId: string; userId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await removeParticipantAction(gameId, userId);
      }}
    >
      <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
        Remove
      </button>
    </form>
  );
}