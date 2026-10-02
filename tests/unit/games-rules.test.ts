import { describe, expect, it } from "vitest";
import {
  canReduceCapacity,
  derivedStatus,
  gameCardState,
  isGameCancellable,
  isGameEditable,
  isGameJoinable,
  nextWaitlistCandidate,
  resolveCreatorDeparture,
  seatsRemaining,
  slotsLabel,
  spotsLabel,
  waitlistOfferDeadline,
  type GameState,
} from "@/lib/games/rules";

const baseState = (overrides: Partial<GameState> = {}): GameState => ({
  status: "OPEN",
  startsAt: new Date("2030-01-01T10:00:00Z"),
  capacity: 4,
  participantCount: 2,
  waitlistCount: 0,
  ...overrides,
});

const NOW = new Date("2029-12-01T00:00:00Z");

describe("game capacity (§16)", () => {
  it("counts remaining seats", () => {
    expect(seatsRemaining(baseState({ participantCount: 3, capacity: 4 }))).toBe(1);
    expect(seatsRemaining(baseState({ participantCount: 6, capacity: 4 }))).toBe(0);
  });

  it("derives FULL when capacity is met", () => {
    expect(derivedStatus(baseState({ participantCount: 4 }))).toBe("FULL");
    expect(derivedStatus(baseState({ participantCount: 2 }))).toBe("OPEN");
  });

  it("never derives a status over a terminal state", () => {
    expect(derivedStatus(baseState({ status: "CANCELLED", participantCount: 4 }))).toBe("CANCELLED");
    expect(derivedStatus(baseState({ status: "COMPLETED", participantCount: 1 }))).toBe("COMPLETED");
  });

  it("refuses to shrink capacity below the players already in", () => {
    expect(canReduceCapacity(4, 3, 4)).toBe(true);
    expect(canReduceCapacity(4, 3, 3)).toBe(true);
    expect(canReduceCapacity(4, 4, 3)).toBe(false);
    expect(canReduceCapacity(4, 1, 1)).toBe(false);
  });
});

describe("join rules (§73)", () => {
  it("allows joining an open future game with seats", () => {
    expect(isGameJoinable(baseState(), NOW)).toBe(true);
  });

  it("rejects cancelled, completed, past and full games", () => {
    expect(isGameJoinable(baseState({ status: "CANCELLED" }), NOW)).toBe(false);
    expect(isGameJoinable(baseState({ status: "COMPLETED" }), NOW)).toBe(false);
    expect(isGameJoinable(baseState({ startsAt: new Date("2028-01-01T00:00:00Z") }), NOW)).toBe(false);
    expect(isGameJoinable(baseState({ participantCount: 4 }), NOW)).toBe(false);
  });
});

describe("edit and cancel rules (§73, §18)", () => {
  it("does not allow edits once the game has started", () => {
    expect(isGameEditable(baseState(), NOW)).toBe(true);
    expect(isGameEditable(baseState({ startsAt: new Date("2028-01-01T00:00:00Z") }), NOW)).toBe(false);
    expect(isGameEditable(baseState({ status: "STARTED" }), NOW)).toBe(false);
  });

  it("allows cancelling only before the game starts", () => {
    expect(isGameCancellable(baseState())).toBe(true);
    expect(isGameCancellable(baseState({ status: "COMPLETED" }))).toBe(false);
    expect(isGameCancellable(baseState({ status: "CANCELLED" }))).toBe(false);
  });
});

describe("waitlist promotion (§17)", () => {
  const entries = [
    { userId: "a", position: 2, status: "WAITING", joinedAt: new Date("2030-01-01") },
    { userId: "b", position: 1, status: "WAITING", joinedAt: new Date("2029-12-31") },
    { userId: "c", position: 3, status: "OFFERED", joinedAt: new Date("2029-12-30") },
  ];

  it("picks the lowest waiting position", () => {
    expect(nextWaitlistCandidate(entries)?.userId).toBe("b");
  });

  it("skips users who already hold an offer", () => {
    expect(nextWaitlistCandidate(entries, ["b"])?.userId).toBe("a");
  });

  it("returns null when nobody is waiting", () => {
    expect(nextWaitlistCandidate([])).toBeNull();
    expect(nextWaitlistCandidate([{ ...entries[0], status: "DECLINED" }])).toBeNull();
  });

  it("defaults the reservation window to 30 minutes", () => {
    const now = new Date("2030-01-01T10:00:00Z");
    expect(waitlistOfferDeadline(now, null).getTime() - now.getTime()).toBe(30 * 60 * 1000);
    expect(waitlistOfferDeadline(now, 10).getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });
});

describe("creator departure (§73)", () => {
  it("transfers to the earliest-joined remaining participant", () => {
    const result = resolveCreatorDeparture([
      { userId: "late", joinedAt: new Date("2030-01-02") },
      { userId: "early", joinedAt: new Date("2030-01-01") },
    ]);
    expect(result).toEqual({ action: "TRANSFER", toUserId: "early" });
  });

  it("cancels the game when nobody remains", () => {
    expect(resolveCreatorDeparture([])).toEqual({ action: "CANCEL" });
  });
});

describe("display helpers (§15, §20)", () => {
  it("formats slot and spot labels", () => {
    expect(slotsLabel(3, 4)).toBe("3 / 4 players");
    expect(spotsLabel(3, 4)).toBe("1 spot remaining");
    expect(spotsLabel(2, 4)).toBe("2 spots remaining");
    expect(spotsLabel(4, 4)).toBe("Game is full");
  });

  it("maps state to card visual state", () => {
    expect(gameCardState(baseState({ status: "CANCELLED" }), NOW)).toBe("CANCELLED");
    expect(gameCardState(baseState({ status: "COMPLETED" }), NOW)).toBe("COMPLETED");
    expect(gameCardState(baseState({ participantCount: 4 }), NOW)).toBe("FULL");
    expect(gameCardState(baseState({ participantCount: 3 }), NOW)).toBe("ALMOST_FULL");
    expect(
      gameCardState(baseState({ startsAt: new Date(NOW.getTime() + 60 * 60 * 1000) }), NOW),
    ).toBe("STARTING_SOON");
    expect(gameCardState(baseState(), NOW)).toBe("OPEN");
  });
});
