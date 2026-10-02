"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Avatar, Breadcrumbs, MetaList, ShareRow } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { useToast } from "@/components/providers/toast";
import {
  formatTimeRange,
  minutesBetween,
  minutesUntil,
  relativeDayLabel,
  formatDate,
} from "@/lib/dates";
import { cityLabel, formatPrice, GAME_TYPE_LABELS, SKILL_LABELS } from "@/lib/nepal";
import { gameCardState, seatsRemaining, slotsLabel, spotsLabel } from "@/lib/games/rules";
import type { GameDetail } from "@/lib/games/queries";
import type { SessionUser } from "@/lib/auth/session";
import {
  acceptWaitlistOfferAction,
  cancelGameAction,
  completeGameAction,
  joinGameAction,
  leaveGameAction,
  leaveWaitlistAction,
  startGameAction,
} from "@/lib/games/actions";

/**
 * Thin client shell that calls the server actions. All rules are enforced
 * server-side; the buttons here only reflect state.
 */
export function GameDetailView({
  game,
  viewer,
  justCreated,
}: {
  game: GameDetail;
  viewer: SessionUser | null;
  justCreated: boolean;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const now = new Date();
  const state = gameCardState(
    {
      status: game.status,
      startsAt: game.startsAt,
      capacity: game.capacity,
      participantCount: game._count.participants,
      waitlistCount: game._count.waitlist,
    },
    now,
  );
  const left = seatsRemaining({
    status: game.status,
    startsAt: game.startsAt,
    capacity: game.capacity,
    participantCount: game._count.participants,
    waitlistCount: game._count.waitlist,
  });
  const minutesToStart = minutesUntil(game.startsAt, now);
  const duration = minutesBetween(game.startsAt, game.endsAt);
  const isPast = game.startsAt <= now;

  const run = async (key: string, action: () => Promise<{ success?: string; error?: string }>, success?: string) => {
    setBusy(key);
    try {
      const result = await action();
      if (result.error) push(result.error, "error");
      else push(result.success ?? success ?? "Done", "success");
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(null);
    }
  };

  const requireLogin = () => {
    push("Log in to join this game", "info");
    router.push(`/login?next=/games/${game.id}`);
  };

  const canCancel = viewer?.id === game.creatorId && ["DRAFT", "OPEN", "FULL"].includes(game.status) && !isPast;
  const canStart = viewer?.id === game.creatorId && !isPast && ["OPEN", "FULL"].includes(game.status);
  const canComplete = viewer?.id === game.creatorId && isPast && !["CANCELLED", "COMPLETED"].includes(game.status);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Games", href: `/games?city=${game.city.toLowerCase()}` },
          { label: game.title ?? "Game" },
        ]}
      />

      {justCreated ? (
        <p className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
          Your game is live. Share it so others can find a spot.
        </p>
      ) : null}

      {game.status === "CANCELLED" ? (
        <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          This game was cancelled{game.cancelReason ? `: ${game.cancelReason}` : "."}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
            <SmartImage
              src={game.court.images[0]}
              alt={`${game.court.name}`}
              className="aspect-[16/9] w-full"
              priority
            />
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={state === "FULL" ? "neutral" : "brand"}>
                {GAME_TYPE_LABELS[game.type]}
              </Badge>
              {game.skillOpenToAll ? (
                <Badge tone="success">Open to all levels</Badge>
              ) : (
                <Badge tone="accent">{SKILL_LABELS[game.skillLevel]}</Badge>
              )}
              <Badge tone={game.pricePerPerson ? "warning" : "success"}>
                {formatPrice(game.pricePerPerson)}
              </Badge>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
              {game.title || `${GAME_TYPE_LABELS[game.type]} at ${game.court.name}`}
            </h1>

            <p className="mt-2 text-ink-soft">
              {relativeDayLabel(game.startsAt, now)} · {formatTimeRange(game.startsAt, game.endsAt)} ·{" "}
              {duration} min
            </p>

            {game.description ? (
              <p className="mt-4 whitespace-pre-line text-ink">{game.description}</p>
            ) : null}
          </div>

          <Card className="mt-6">
            <h2 className="font-semibold text-ink">Game details</h2>
            <div className="mt-4">
              <MetaList
                items={[
                  { label: "Court", value: <Link className="text-brand-700 hover:underline" href={`/courts/${game.court.slug}`}>{game.court.name}</Link> },
                  { label: "City", value: cityLabel(game.city) },
                  { label: "Surface", value: game.court.surface.replace(/_/g, " ") },
                  { label: "Setting", value: game.court.indoorOutdoor === "INDOOR" ? "Indoor" : "Outdoor" },
                  { label: "Date", value: formatDate(game.startsAt) },
                  { label: "Format", value: game.format },
                ]}
              />
            </div>

            {(game.ballInfo || game.equipmentInfo || game.organizerNote) && (
              <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm text-ink-soft">
                {game.ballInfo ? <p>🏓 {game.ballInfo}</p> : null}
                {game.equipmentInfo ? <p>🎒 {game.equipmentInfo}</p> : null}
                {game.organizerNote ? <p>📣 {game.organizerNote}</p> : null}
              </div>
            )}
          </Card>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-ink">
                Players ({slotsLabel(game._count.participants, game.capacity)})
              </h2>
              {!game.viewer.isParticipant && game.status !== "CANCELLED" && !isPast ? (
                <span className="text-sm font-medium text-brand-700">{spotsLabel(game._count.participants, game.capacity)}</span>
              ) : null}
            </div>

            {game.participants.length === 0 ? (
              <EmptyState title="No players yet" description="Be the first to join." icon="🏓" />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {game.participants.map((participant) => (
                  <li
                    key={participant.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-3"
                  >
                    <Avatar name={participant.user.fullName} src={participant.user.avatarUrl} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{participant.user.fullName}</p>
                      <p className="text-xs text-ink-soft">
                        {participant.role === "CREATOR" ? "Organiser" : "Player"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {game.waitlist.length > 0 ? (
              <div className="mt-4 rounded-xl border border-line bg-surface p-4">
                <h3 className="text-sm font-semibold text-ink">
                  Waitlist ({game.waitlist.length})
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {game.waitlist.slice(0, 5).map((entry) => (
                    <li key={entry.id}>
                      {entry.position}. {entry.user.fullName}
                      {viewer?.id === entry.userId ? " (you)" : ""}
                      {entry.status === "OFFERED" ? " — spot offered" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="mt-6">
            <h2 className="font-semibold text-ink">Organiser</h2>
            <Link
              href={`/players/${game.creator.username}`}
              className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-3 hover:border-brand-300"
            >
              <Avatar name={game.creator.fullName} src={game.creator.avatarUrl} size={44} />
              <div>
                <p className="font-semibold text-ink">{game.creator.fullName}</p>
                <p className="text-xs text-ink-soft">@{game.creator.username}</p>
              </div>
            </Link>
          </section>

          <div className="mt-6">
            <ShareRow title={game.title ?? "Pickleball game"} path={`/games/${game.id}`} />
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            {game.status === "CANCELLED" ? (
              <p className="text-sm font-medium text-red-700">This game was cancelled.</p>
            ) : isPast ? (
              <p className="text-sm text-ink-soft">
                This game started on {formatDate(game.startsAt)} and is no longer joinable.
              </p>
            ) : game.viewer.isParticipant ? (
              <>
                <p className="text-sm font-semibold text-brand-800">You are in this game.</p>
                <p className="mt-1 text-sm text-ink-soft">
                  See you on court{formatTime(game.startsAt)} at {game.court.name}.
                </p>
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => run("leave", () => leaveGameAction(game.id))}
                >
                  {busy === "leave" ? "Leaving…" : "Leave Game"}
                </Button>
              </>
            ) : game.viewer.isWaitlisted ? (
              <>
                <p className="text-sm font-semibold text-ink">
                  You are #{game.viewer.waitlistPosition} on the waitlist
                </p>
                {game.viewer.waitlistStatus === "OFFERED" ? (
                  <>
                    <p className="mt-1 text-sm text-brand-800">
                      A spot opened up. Claim it before someone else takes it.
                    </p>
                    <Button
                      className="mt-4 w-full"
                      disabled={busy !== null}
                      onClick={() => run("accept", () => acceptWaitlistOfferAction(game.id))}
                    >
                      {busy === "accept" ? "Claiming…" : "Claim your spot"}
                    </Button>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft">
                    We will notify you the moment a spot opens up.
                  </p>
                )}
                <Button
                  className="mt-2 w-full"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => run("leave-waitlist", () => leaveWaitlistAction(game.id))}
                >
                  {busy === "leave-waitlist" ? "Leaving…" : "Leave waitlist"}
                </Button>
              </>
            ) : left > 0 ? (
              <>
                <p className="text-sm font-semibold text-ink">
                  {slotsLabel(game._count.participants, game.capacity)}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{spotsLabel(game._count.participants, game.capacity)}</p>
                {minutesToStart > 0 && minutesToStart < 120 ? (
                  <p className="mt-2 text-sm font-medium text-accent-700">
                    Starts in {minutesToStart} minutes
                  </p>
                ) : null}
                <Button
                  className="mt-4 w-full"
                  size="lg"
                  disabled={busy !== null}
                  onClick={() => (viewer ? run("join", () => joinGameAction(game.id)) : requireLogin())}
                >
                  {busy === "join" ? "Joining…" : viewer ? "Join Game" : "Log in to join"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink">This game is full</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {game.waitlist.length > 0
                    ? `${game.waitlist.length} ${game.waitlist.length === 1 ? "player is" : "players are"} waiting.`
                    : "Join the waitlist to be offered the next free spot."}
                </p>
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  disabled={busy !== null || !game.waitlistEnabled}
                  onClick={() =>
                    viewer
                      ? run("waitlist", () => joinGameAction(game.id))
                      : requireLogin()
                  }
                >
                  {busy === "waitlist"
                    ? "Joining…"
                    : game.waitlistEnabled
                      ? "Join Waitlist"
                      : "Waitlist closed"}
                </Button>
              </>
            )}

            {game.pricePerPerson ? (
              <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">
                {formatPrice(game.pricePerPerson)} per player. Pay the organiser directly at the court.
              </p>
            ) : null}
          </Card>

          <Card className="mt-4">
            <h2 className="text-sm font-semibold text-ink">Where</h2>
            <p className="mt-1 text-sm text-ink-soft">{game.court.name}</p>
            <p className="text-sm text-ink-soft">{game.court.address ?? cityLabel(game.court.city)}</p>
            {game.court.latitude && game.court.longitude ? (
              <a
                href={`https://www.openstreetmap.org/?mlat=${game.court.latitude}&mlon=${game.court.longitude}#map=16/${game.court.latitude}/${game.court.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                Open in maps ↗
              </a>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(game.court.amenities ?? []).slice(0, 4).map((amenity) => (
                <Badge key={amenity} tone="neutral">
                  {amenity}
                </Badge>
              ))}
            </div>
          </Card>

          {game.viewer.isCreator || canCancel || canStart || canComplete ? (
            <Card className="mt-4">
              <h2 className="text-sm font-semibold text-ink">Organiser controls</h2>
              <div className="mt-3 space-y-2">
                {canStart ? (
                  <Button
                    className="w-full"
                    variant="secondary"
                    disabled={busy !== null}
                    onClick={() => run("start", () => startGameAction(game.id))}
                  >
                    {busy === "start" ? "Starting…" : "Mark as started"}
                  </Button>
                ) : null}
                {canComplete ? (
                  <Button
                    className="w-full"
                    variant="secondary"
                    disabled={busy !== null}
                    onClick={() => run("complete", () => completeGameAction(game.id))}
                  >
                    {busy === "complete" ? "Saving…" : "Mark as completed"}
                  </Button>
                ) : null}
                {canCancel ? (
                  <CancelControl gameId={game.id} busy={busy} run={run} />
                ) : null}
                <ButtonLink href={`/games/${game.id}/manage`} variant="ghost" className="w-full">
                  Manage game
                </ButtonLink>
              </div>
            </Card>
          ) : null}

          <ButtonLink href={`/games?city=${game.city.toLowerCase()}`} variant="ghost" className="mt-4 w-full">
            More games in {cityLabel(game.city)}
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}

function CancelControl({
  gameId,
  busy,
  run,
}: {
  gameId: string;
  busy: string | null;
  run: (
    key: string,
    action: () => Promise<{ success?: string; error?: string }>,
    success?: string,
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="danger" className="w-full" onClick={() => setOpen(true)}>
        Cancel game
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-800">Cancel this game?</p>
      <p className="mt-1 text-xs text-red-700">
        Everyone who joined will be notified. The game stays visible as cancelled — it is never deleted.
      </p>
      <CancelForm gameId={gameId} busy={busy} run={run} onCancel={() => setOpen(false)} />
    </div>
  );
}

function CancelForm({
  gameId,
  busy,
  run,
  onCancel,
}: {
  gameId: string;
  busy: string | null;
  run: (
    key: string,
    action: () => Promise<{ success?: string; error?: string }>,
    success?: string,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <form
        id={`cancel-${gameId}`}
        action={async (formData) => {
          await run("cancel", () => cancelGameAction(gameId, {} as never, formData));
          onCancel();
        }}
      >
        <input
          type="text"
          name="reason"
          placeholder="Reason (optional)"
          maxLength={300}
          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
        />
      </form>
      <div className="flex gap-2">
        <Button
          type="submit"
          form={`cancel-${gameId}`}
          variant="danger"
          size="sm"
          disabled={busy !== null}
        >
          {busy === "cancel" ? "Cancelling…" : "Yes, cancel it"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Keep game
        </Button>
      </div>
    </div>
  );
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}