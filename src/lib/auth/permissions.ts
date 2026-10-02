/**
 * Server-side authorization (REQUIREMENT.md §72, §82).
 *
 * Rules:
 *  - Every check is derived from the session, never from client input.
 *  - `assertX` variants throw an `AuthorizationError` which route handlers
 *    translate into a 401/403; `canX` variants return a boolean for UI hints.
 */

import "server-only";
import { prisma } from "@/lib/db";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import type { UserRole } from "@prisma/client";

export class AuthenticationError extends Error {
  readonly status = 401;
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  readonly status = 400;
  readonly fieldErrors?: Record<string, string[]>;
  constructor(message = "Invalid input.", fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/** Throws unless a user is signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

const STAFF_ROLES: UserRole[] = ["MODERATOR", "ADMIN"];

export function isStaff(user: SessionUser | null): boolean {
  return !!user && STAFF_ROLES.includes(user.role);
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "ADMIN";
}

/** Throws unless the signed-in user has one of `roles`. */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthorizationError("Your account does not have access to this area.");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("ADMIN");
}

export async function requireStaff(): Promise<SessionUser> {
  return requireRole("ADMIN", "MODERATOR");
}

/**
 * Verifies the user owns a game, or is club staff for the game's club, or is
 * platform staff. Returns the game record so callers avoid a second query.
 */
export async function requireGameOwner(gameId: string): Promise<
  { id: string; creatorId: string; clubId: string | null; status: string }
> {
  const user = await requireUser();
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, creatorId: true, clubId: true, status: true, capacity: true, startsAt: true },
  });
  if (!game) throw new NotFoundError("Game not found.");
  if (game.creatorId === user.id) return game;
  if (isStaff(user)) return game;
  if (game.clubId && (await userManagesClub(user.id, game.clubId))) return game;
  throw new AuthorizationError("Only the game organiser can do that.");
}

/** Verifies the user owns a club or has a management role in it. */
export async function requireClubManager(clubId: string): Promise<{
  id: string;
  ownerId: string;
  name: string;
  slug: string;
}> {
  const user = await requireUser();
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, ownerId: true, name: true, slug: true },
  });
  if (!club) throw new NotFoundError("Club not found.");
  if (club.ownerId === user.id) return club;
  if (isAdmin(user)) return club;

  const membership = await prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId: user.id } },
    select: { role: true },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    throw new AuthorizationError("You do not manage this club.");
  }
  return club;
}

export async function userManagesClub(userId: string, clubId: string): Promise<boolean> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { ownerId: true },
  });
  if (club?.ownerId === userId) return true;
  const membership = await prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { role: true },
  });
  return !!membership && ["OWNER", "ADMIN"].includes(membership.role);
}

/** Verifies the user owns the tournament or is platform staff. */
export async function requireTournamentOrganizer(tournamentId: string): Promise<{
  id: string;
  organizerId: string;
  slug: string;
  status: string;
}> {
  const user = await requireUser();
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, organizerId: true, slug: true, status: true },
  });
  if (!tournament) throw new NotFoundError("Tournament not found.");
  if (tournament.organizerId === user.id) return tournament;
  if (isStaff(user)) return tournament;
  throw new AuthorizationError("Only the organiser can manage this tournament.");
}

/** Verifies a conversation belongs to the user (§41 — no third-party access). */
export async function requireConversationParticipant(conversationId: string): Promise<{
  id: string;
}> {
  const user = await requireUser();
  const membership = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { conversationId: true },
  });
  if (!membership) throw new AuthorizationError("You are not part of this conversation.");
  return { id: conversationId };
}

/** True when the viewer may see another user's profile given privacy settings. */
export function canViewProfile(
  viewer: SessionUser | null,
  target: { id: string; visibility: string; userId: string },
): boolean {
  if (viewer?.id === target.userId) return true;
  if (isStaff(viewer)) return true;
  if (target.visibility === "PUBLIC") return true;
  if (target.visibility === "COMMUNITY_ONLY") return viewer !== null;
  return false;
}

/** Users who blocked each other cannot interact or message (§84). */
export async function isBlockedEitherWay(aId: string, bId: string): Promise<boolean> {
  const count = await prisma.block.count({
    where: {
      OR: [
        { blockerId: aId, blockedId: bId },
        { blockerId: bId, blockedId: aId },
      ],
    },
  });
  return count > 0;
}