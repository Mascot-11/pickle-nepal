import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { Session, User, UserRole } from "@prisma/client";

const SESSION_COOKIE = "picklenepal_session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: UserRole;
  city: string;
  avatarUrl: string | null;
  isOnboarded: boolean;
  status: User["status"];
};

/**
 * Reads the current session from the httpOnly cookie and returns the owning user.
 * Cached per-request so multiple server components share one lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expires < new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    username: u.username,
    role: u.role,
    city: u.city,
    avatarUrl: u.avatarUrl,
    isOnboarded: u.isOnboarded,
    status: u.status,
  };
});

export async function createSession(userId: string): Promise<void> {
  const headerList = await headers();
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expires: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
      userAgent: headerList.get("user-agent")?.slice(0, 255),
      ipAddress: getClientIp(headerList),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Invalidates every session for a user (§9.3 — used on password reset/ban). */
export async function invalidateUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export function getClientIp(headersList: Headers): string | null {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return headersList.get("x-real-ip")?.slice(0, 64) ?? null;
}

export async function touchSession(sessionToken: string): Promise<Session | null> {
  return prisma.session.findUnique({ where: { sessionToken } });
}