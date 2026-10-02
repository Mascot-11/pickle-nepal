/**
 * Business rules for games (REQUIREMENT.md §13–§20, §73, §16).
 *
 * These are deliberately pure and separately unit-testable: capacity checks,
 * waitlist promotion and cancellation legality do not belong in UI code (§102.7).
 */

export type GameState = {
  status: string;
  startsAt: Date;
  capacity: number;
  participantCount: number;
  waitlistCount: number;
};

export function seatsRemaining(state: GameState): number {
  return Math.max(0, state.capacity - state.participantCount);
}

export function isGameJoinable(state: GameState, now: Date): boolean {
  return (
    state.status === "OPEN" &&
    state.startsAt.getTime() > now.getTime() &&
    seatsRemaining(state) > 0
  );
}

export function isGameCancellable(state: GameState): boolean {
  return ["DRAFT", "OPEN", "FULL"].includes(state.status);
}

export function isGameEditable(state: GameState, now: Date): boolean {
  // A game cannot be edited freely once it has started (§73).
  return ["DRAFT", "OPEN", "FULL"].includes(state.status) && state.startsAt > now;
}

/** Status the game should have given its participant count. */
export function derivedStatus(state: GameState): string {
  if (["CANCELLED", "COMPLETED", "STARTED", "DRAFT"].includes(state.status)) {
    return state.status;
  }
  return state.participantCount >= state.capacity ? "FULL" : "OPEN";
}

/** Capacity can never drop below those already playing. */
export function canReduceCapacity(
  currentCapacity: number,
  participantCount: number,
  newCapacity: number,
): boolean {
  return newCapacity >= participantCount && newCapacity >= 2;
}

export type WaitlistEntry = {
  userId: string;
  position: number;
  status: string;
  joinedAt: Date;
};

/** The next waitlisted user who can be promoted, oldest position first. */
export function nextWaitlistCandidate(
  entries: WaitlistEntry[],
  excludeUserIds: string[] = [],
): WaitlistEntry | null {
  return (
    entries
      .filter((e) => e.status === "WAITING" && !excludeUserIds.includes(e.userId))
      .sort((a, b) => a.position - b.position)[0] ?? null
  );
}

/** How long an offer stays open before moving to the next person (§17). */
export function waitlistOfferDeadline(
  now: Date,
  reserveMinutes: number | null,
): Date {
  const minutes = reserveMinutes && reserveMinutes > 0 ? reserveMinutes : 30;
  return new Date(now.getTime() + minutes * 60 * 1000);
}

export function isWaitlistOfferExpired(offerExpiresAt: Date | null, now: Date): boolean {
  return !!offerExpiresAt && offerExpiresAt.getTime() <= now.getTime();
}

/**
 * §73 — when the creator leaves, the game must not be orphaned.
 * Documented rule: transfer ownership to the earliest-joined remaining
 * participant; if nobody remains, cancel the game.
 */
export function resolveCreatorDeparture(
  remainingParticipants: Array<{ userId: string; joinedAt: Date }>,
): { action: "TRANSFER"; toUserId: string } | { action: "CANCEL" } {
  if (remainingParticipants.length === 0) return { action: "CANCEL" };
  const next = [...remainingParticipants].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
  return { action: "TRANSFER", toUserId: next.userId };
}

export const DEFAULT_CAPACITIES: Record<string, number> = {
  SINGLES: 2,
  DOUBLES: 4,
  OPEN_PLAY: 8,
  FRIENDLY: 4,
  COMPETITIVE: 4,
  DRILL_SESSION: 8,
  KING_OF_COURT: 4,
};

/** Slot label for the game card / detail page (§15). */
export function slotsLabel(participantCount: number, capacity: number): string {
  return `${participantCount} / ${capacity} players`;
}

export function spotsLabel(participantCount: number, capacity: number): string {
  const left = seatsRemaining({ capacity, participantCount } as GameState);
  if (left === 0) return "Game is full";
  return left === 1 ? "1 spot remaining" : `${left} spots remaining`;
}

/** §20 visual states. */
export type GameCardState = "OPEN" | "ALMOST_FULL" | "FULL" | "STARTING_SOON" | "COMPLETED" | "CANCELLED";

export function gameCardState(state: GameState, now: Date): GameCardState {
  if (state.status === "CANCELLED") return "CANCELLED";
  if (state.status === "COMPLETED") return "COMPLETED";
  if (state.status === "STARTED") return "STARTING_SOON";
  const left = seatsRemaining(state);
  if (left === 0) return "FULL";
  if (left === 1) return "ALMOST_FULL";
  if (state.startsAt.getTime() - now.getTime() < 2 * 60 * 60 * 1000) return "STARTING_SOON";
  return "OPEN";
}