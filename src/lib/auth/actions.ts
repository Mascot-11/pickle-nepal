"use server";

/**
 * Auth actions (REQUIREMENT.md §9). All inputs are re-validated server-side and
 * rate-limited; no password or secret is ever returned to the client.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  invalidateUserSessions,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation";
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email";
import { randomToken, randomReferralCode, normalizeUsername } from "@/lib/slug";
import { track } from "@/lib/analytics";
import { NotificationService } from "@/lib/notifications/service";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
};

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function firstZodError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): AuthActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: Object.values(fieldErrors)[0]?.[0] ?? "Please check the form.", fieldErrors };
}

async function uniqueUsername(preferred?: string): Promise<string> {
  const base = normalizeUsername(preferred ?? "") || "player";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate =
      attempt === 0 ? base : `${base}${Math.floor(10 + Math.random() * 89)}`;
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base}${randomToken(3).toLowerCase()}`;
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    city: formData.get("city"),
    username: formData.get("username") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
    referralCode: formData.get("referralCode") || undefined,
  });

  if (!parsed.success) return firstZodError(parsed.error);

  const input = parsed.data;
  const ip = await clientIdentifier();
  const limited = await rateLimit("signup", ip);
  if (!limited.ok) {
    return { error: "Too many accounts created from this device. Try again later." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    return { fieldErrors: { email: ["An account with this email already exists"] }, error: "That email is already registered." };
  }

  const username = await uniqueUsername(input.username);
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let referrerId: string | null = null;
  if (input.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referrerCode: input.referralCode.toUpperCase() },
      select: { id: true },
    });
    referrerId = referrer?.id ?? null;
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        username,
        city: input.city as never,
        avatarUrl: input.avatarUrl || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        referrerCode: randomReferralCode(),
        referredById: referrerId,
        profile: { create: { onboardingStep: 1 } },
        notificationPreference: { create: {} },
      },
      select: { id: true, fullName: true, email: true, referredById: true },
    });

    if (referrerId) {
      await tx.referral.create({
        data: { code: input.referralCode!, referrerId, referredId: created.id },
      });
    }

    return created;
  });

  await createSession(user.id);
  await track({ name: "SIGNUP", userId: user.id });
  void sendEmail({ to: user.email, ...EMAIL_TEMPLATES.welcome(user.fullName) });

  if (referrerId) {
    await NotificationService.send({
      userId: referrerId,
      type: "FOLLOW",
      category: "SOCIAL",
      title: "Someone joined with your code",
      body: "A new player signed up using your referral code.",
      data: { userId: user.id },
    });
  }

  revalidatePath("/dashboard");
  redirect("/onboarding");
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return firstZodError(parsed.error);

  const ip = await clientIdentifier();
  const limited = await rateLimit("login", ip);
  if (!limited.ok) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      passwordHash: true,
      status: true,
      isOnboarded: true,
      role: true,
      city: true,
      avatarUrl: true,
      bannedReason: true,
    },
  });

  // Always run a hash comparison to avoid leaking whether the account exists.
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const valid = await bcrypt.compare(parsed.data.password, hash);

  if (!user || !user.passwordHash || !valid) {
    return { error: "Incorrect email or password." };
  }
  if (user.status === "BANNED") {
    return { error: `This account has been permanently banned.${user.bannedReason ? ` Reason: ${user.bannedReason}` : ""}` };
  }
  if (user.status === "SUSPENDED") {
    return { error: "This account is temporarily suspended." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await track({ name: "LOGIN", userId: user.id });

  revalidatePath("/", "layout");
  redirect(user.isOnboarded ? "/dashboard" : "/onboarding");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const ip = await clientIdentifier();
  const limited = await rateLimit("passwordReset", ip);
  if (!limited.ok) {
    return { error: "Too many reset requests. Try again later." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, fullName: true, email: true },
  });

  // Always report success so the endpoint cannot be used to enumerate accounts.
  if (!user) {
    return { success: "If that email is registered, a reset link is on its way." };
  }

  const rawToken = randomToken(32);
  const tokenHash = await bcrypt.hash(rawToken, 10);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  void sendEmail({
    to: user.email,
    ...EMAIL_TEMPLATES.passwordReset(
      user.fullName,
      `${appUrl}/reset-password?token=${rawToken}`,
    ),
  });

  return { success: "If that email is registered, a reset link is on its way." };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return firstZodError(parsed.error);

  const records = await prisma.passwordResetToken.findMany({
    where: { expiresAt: { gt: new Date() }, usedAt: null },
    select: { id: true, userId: true, tokenHash: true },
  });

  for (const record of records) {
    if (await bcrypt.compare(parsed.data.token, record.tokenHash)) {
      const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
      await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
        prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      ]);
      // §9.3 — invalidate existing sessions on password change.
      await invalidateUserSessions(record.userId);
      return { success: "Your password has been updated. You can sign in now." };
    }
  }

  return { error: "This reset link is invalid or has expired." };
}

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5tG0Vk3Z1Hn1zv2wYlF0TQm0jF9J5e";

async function clientIdentifier(): Promise<string> {
  const cookieStore = await cookies();
  const forwarded = cookieStore.get("pn_client")?.value;
  if (forwarded) return forwarded;
  const { headers } = await import("next/headers");
  const list = await headers();
  const ip =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    list.get("x-real-ip") ??
    "local";
  return ip.slice(0, 64);
}