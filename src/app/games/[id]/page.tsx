import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameById } from "@/lib/games/queries";
import { formatDateTime } from "@/lib/dates";
import { GameDetailView } from "@/components/games/game-detail";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) {
    return { title: "Game not found", robots: { index: false, follow: false } };
  }

  const title = game.title || `${game.type.replace(/_/g, " ")} at ${game.court.name}`;
  const when = formatDateTime(game.startsAt);
  const description = `${title} — ${when} at ${game.court.name}. ${game._count.participants}/${game.capacity} players joined.`;

  return {
    title,
    description,
    alternates: { canonical: `/games/${game.id}` },
    openGraph: {
      type: "article",
      title: `${title} | PickleNepal`,
      description,
      images: game.court.images[0]
        ? [{ url: game.court.images[0], width: 1200, height: 630, alt: game.court.name }]
        : undefined,
    },
  };
}

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ created?: string; joined?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();

  const game = await getGameById(id, user?.id ?? null);
  if (!game) notFound();

  return <GameDetailView game={game} viewer={user} justCreated={query.created === "1"} />;
}