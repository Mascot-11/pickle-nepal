import Link from "next/link";
import { gameCardState, slotsLabel, spotsLabel } from "@/lib/games/rules";
import { formatTimeRange, relativeDayLabel, formatDateShort } from "@/lib/dates";
import { cityLabel, formatPrice, GAME_TYPE_LABELS, SKILL_LABELS } from "@/lib/nepal";
import type { GameWithRelations } from "@/lib/games/queries";
import { Badge } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";

const STATE_TONES = {
  OPEN: "success",
  ALMOST_FULL: "warning",
  FULL: "neutral",
  STARTING_SOON: "info",
  COMPLETED: "neutral",
  CANCELLED: "danger",
} as const;

const STATE_LABELS = {
  OPEN: "Open",
  ALMOST_FULL: "Almost full",
  FULL: "Full",
  STARTING_SOON: "Starting soon",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export function GameCard({ game, now }: { game: GameWithRelations; now: Date }) {
  const participantCount = game._count.participants;
  const state = gameCardState(
    {
      status: game.status,
      startsAt: game.startsAt,
      capacity: game.capacity,
      participantCount,
      waitlistCount: game._count.waitlist,
    },
    now,
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/games/${game.id}`} className="flex h-full flex-col">
        <div className="relative aspect-[16/9] overflow-hidden bg-brand-100">
          <SmartImage
            src={game.court.images[0]}
            alt={`${game.court.name} court`}
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3">
            <Badge tone={STATE_TONES[state]}>{STATE_LABELS[state]}</Badge>
          </span>
          {game.pricePerPerson && game.pricePerPerson > 0 ? (
            <span className="absolute right-3 top-3 rounded-full bg-ink/85 px-2.5 py-0.5 text-xs font-bold text-white">
              {formatPrice(game.pricePerPerson)}
            </span>
          ) : (
            <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">
              Free
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 font-bold leading-snug text-ink group-hover:text-brand-800">
            {game.title || `${GAME_TYPE_LABELS[game.type]} at ${game.court.name}`}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {game.court.name} · {cityLabel(game.court.city)}
          </p>

          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <dt className="sr-only">When</dt>
              <dd className="font-medium text-ink">
                {relativeDayLabel(game.startsAt, now)} · {formatTimeRange(game.startsAt, game.endsAt)}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <dt className="sr-only">Details</dt>
              <dd>
                {GAME_TYPE_LABELS[game.type]}
                {game.skillOpenToAll ? " · Open to all" : ` · ${SKILL_LABELS[game.skillLevel]}`}
              </dd>
            </div>
          </dl>

          <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
            <Avatar name={game.creator.fullName} src={game.creator.avatarUrl} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{game.creator.fullName}</p>
              <p className="text-xs text-ink-soft">
                {slotsLabel(participantCount, game.capacity)}
              </p>
            </div>
            {state === "OPEN" || state === "ALMOST_FULL" ? (
              <Badge tone={state === "ALMOST_FULL" ? "warning" : "brand"}>
                {spotsLabel(participantCount, game.capacity)}
              </Badge>
            ) : state === "FULL" ? (
              <Badge tone="neutral">Waitlist open</Badge>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
      <div className="skeleton aspect-[16/9]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

export { formatDateShort };