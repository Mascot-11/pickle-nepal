"use server";

/** Profile, privacy, settings, admin and organizer mutations (§11, §43, §54–§57). */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  requireAdmin,
  requireStaff,
  requireUser,
} from "@/lib/auth/permissions";
import { invalidateUserSessions } from "@/lib/auth/session";
import { profileUpdateSchema, privacySettingsSchema, eventCreateSchema } from "@/lib/validation";
import { setFeatureFlag } from "@/lib/feature-flags";
import { NotificationService } from "@/lib/notifications/service";
import { FEATURE_FLAGS, type FeatureFlagKey } from "@/lib/nepal";
import { fromNepalParts } from "@/lib/dates";
import { uniqueSlug } from "@/lib/slug";

export type SettingsState = { error?: string; success?: string; fieldErrors?: Record<string, string[]> };

function firstError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): SettingsState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: Object.values(fieldErrors)[0]?.[0] ?? "Please check the form.", fieldErrors };
}

// --- Profile (§11) ---------------------------------------------------------

export async function updateProfileAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();

  const parsed = profileUpdateSchema.safeParse({
    fullName: formData.get("fullName") || undefined,
    username: formData.get("username") || undefined,
    phone: formData.get("phone") || undefined,
    city: formData.get("city") || undefined,
    bio: formData.get("bio") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
    coverUrl: formData.get("coverUrl") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    gender: formData.get("gender") || undefined,
    skillLevel: formData.get("skillLevel") || undefined,
    duprRating: formData.get("duprRating") || undefined,
    preferredFormats: formData.getAll("preferredFormats"),
    position: formData.get("position") || undefined,
    availability: formData.getAll("availability"),
    frequency: formData.get("frequency") || undefined,
    instagram: formData.get("instagram") || undefined,
    facebook: formData.get("facebook") || undefined,
    visibility: formData.get("visibility") || undefined,
  });
  if (!parsed.success) return firstError(parsed.error);
  const input = parsed.data;

  if (input.username) {
    const taken = await prisma.user.findFirst({
      where: { username: input.username, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) {
      return { fieldErrors: { username: ["That username is taken"] }, error: "That username is taken." };
    }
  }

  const profileData = {
    ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
    ...(input.skillLevel ? { skillLevel: input.skillLevel } : {}),
    ...(input.duprRating !== undefined ? { duprRating: input.duprRating } : {}),
    ...(input.preferredFormats ? { preferredFormats: input.preferredFormats } : {}),
    ...(input.position ? { position: input.position } : {}),
    ...(input.availability ? { availability: input.availability } : {}),
    ...(input.frequency ? { frequency: input.frequency } : {}),
    ...(input.instagram !== undefined ? { instagram: input.instagram || null } : {}),
    ...(input.facebook !== undefined ? { facebook: input.facebook || null } : {}),
    ...(input.visibility ? { visibility: input.visibility } : {}),
  };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        ...(input.fullName ? { fullName: input.fullName } : {}),
        ...(input.username ? { username: input.username } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.city ? { city: input.city as never } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
        ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl || null } : {}),
        ...(input.dateOfBirth ? { dateOfBirth: new Date(input.dateOfBirth) } : {}),
        ...(input.gender ? { gender: input.gender } : {}),
        ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
      },
    }),
    prisma.playerProfile.update({ where: { userId: user.id }, data: profileData }),
  ]);

  revalidatePath("/profile");
  revalidatePath(`/players/${user.username}`);
  return { success: "Profile updated." };
}

export async function updatePrivacyAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = privacySettingsSchema.safeParse({
    visibility: formData.get("visibility"),
    showDOB: formData.get("showDOB") === "on",
  });
  if (!parsed.success) return firstError(parsed.error);

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { visibility: parsed.data.visibility, showDOB: parsed.data.showDOB },
  });

  revalidatePath("/settings/privacy");
  return { success: "Privacy settings saved." };
}

export async function updateNotificationPreferencesAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const flag = (name: string) => formData.get(name) === "on";

  const data = {
    gameInApp: flag("gameInApp"),
    gameEmail: flag("gameEmail"),
    tournamentInApp: flag("tournamentInApp"),
    tournamentEmail: flag("tournamentEmail"),
    eventInApp: flag("eventInApp"),
    eventEmail: flag("eventEmail"),
    socialInApp: flag("socialInApp"),
    socialEmail: flag("socialEmail"),
    messageInApp: flag("messageInApp"),
    messageEmail: flag("messageEmail"),
    marketingEmail: flag("marketingEmail"),
    pushEnabled: flag("pushEnabled"),
  };

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/settings/notifications");
  return { success: "Notification preferences saved." };
}

// --- Admin: users (§56) ----------------------------------------------------

export async function setUserStatusAction(
  userId: string,
  action: "SUSPEND" | "BAN" | "RESTORE",
  reason?: string,
): Promise<SettingsState> {
  const admin = await requireAdmin();

  if (userId === admin.id) return { error: "You cannot change your own account status." };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!target) throw new NotFoundError("User not found.");

  const data =
    action === "SUSPEND"
      ? { status: "SUSPENDED" as const, suspendedAt: new Date(), suspendReason: reason ?? null }
      : action === "BAN"
        ? { status: "BANNED" as const, bannedAt: new Date(), bannedReason: reason ?? null }
        : { status: "ACTIVE" as const, suspendedAt: null, suspendReason: null, bannedAt: null, bannedReason: null };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data });
    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: `USER_${action}`,
        targetType: "USER",
        targetId: userId,
        reason: reason ?? null,
      },
    });
  });

  if (action !== "RESTORE") {
    // Suspension and bans invalidate sessions immediately.
    await invalidateUserSessions(userId);
  }

  revalidatePath("/admin/users");
  return { success: `User ${action.toLowerCase()}ed.` };
}

export async function setUserRoleAction(userId: string, role: string): Promise<SettingsState> {
  const admin = await requireAdmin();
  const allowed = ["PLAYER", "CLUB_ADMIN", "COACH", "ORGANIZER", "SELLER", "MODERATOR", "ADMIN"];
  if (!allowed.includes(role)) return { error: "Unknown role." };
  if (userId === admin.id) return { error: "You cannot change your own role." };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: role as never } });
    await tx.auditLog.create({
      data: { adminId: admin.id, action: "USER_ROLE_CHANGED", targetType: "USER", targetId: userId, metadata: { role } },
    });
  });

  revalidatePath("/admin/users");
  return { success: "Role updated." };
}

// --- Admin: moderation (§58, §94) -----------------------------------------

export async function resolveReportAction(
  reportId: string,
  action: "DISMISS" | "REMOVE" | "WARN" | "SUSPEND" | "BAN",
): Promise<SettingsState> {
  const admin = await requireStaff();

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      targetType: true,
      postId: true,
      commentId: true,
      reviewId: true,
      targetUserId: true,
      status: true,
    },
  });
  if (!report) throw new NotFoundError("Report not found.");
  if (report.status === "RESOLVED" || report.status === "DISMISSED") {
    return { error: "This report has already been handled." };
  }

  await prisma.$transaction(async (tx) => {
    if (action === "REMOVE") {
      if (report.postId) await tx.communityPost.update({ where: { id: report.postId }, data: { isHidden: true, deletedAt: new Date() } });
      if (report.commentId) await tx.comment.update({ where: { id: report.commentId }, data: { deletedAt: new Date() } });
      if (report.reviewId) await tx.review.update({ where: { id: report.reviewId }, data: { status: "REMOVED" } });
    }

    if ((action === "SUSPEND" || action === "BAN") && report.targetUserId) {
      await tx.user.update({
        where: { id: report.targetUserId },
        data:
          action === "BAN"
            ? { status: "BANNED", bannedAt: new Date(), bannedReason: "Removed after a report" }
            : { status: "SUSPENDED", suspendedAt: new Date(), suspendReason: "Removed after a report" },
      });
      await tx.session.deleteMany({ where: { userId: report.targetUserId } });
    }

    await tx.report.update({
      where: { id: reportId },
      data: {
        action: action as never,
        status: action === "DISMISS" ? "DISMISSED" : "RESOLVED",
        actionedBy: admin.id,
        actionedAt: new Date(),
        resolvedAt: new Date(),
      },
    });

    // Every moderation action is audited (§58, §94).
    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: `REPORT_${action}`,
        targetType: report.targetType,
        targetId: report.postId ?? report.commentId ?? report.reviewId ?? report.targetUserId ?? reportId,
        metadata: { reportId },
      },
    });
  });

  revalidatePath("/admin/reports");
  return { success: `Report ${action.toLowerCase()}ed.` };
}

// --- Admin: verification (§57) --------------------------------------------

export async function decideVerificationAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED" | "MORE_INFORMATION_REQUIRED",
  note?: string,
): Promise<SettingsState> {
  const admin = await requireAdmin();

  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    select: { id: true, type: true, applicantId: true, status: true },
  });
  if (!request) throw new NotFoundError("Verification request not found.");
  if (["APPROVED", "REJECTED"].includes(request.status)) {
    return { error: "This request has already been decided." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: decision as never,
        reviewNote: note ?? null,
        reviewerId: admin.id,
        decidedAt: decision === "APPROVED" ? new Date() : null,
      },
    });

    if (decision === "APPROVED") {
      switch (request.type) {
        case "CLUB": {
          const club = await tx.club.findFirst({
            where: { ownerId: request.applicantId },
            select: { id: true },
          });
          if (club) await tx.club.update({ where: { id: club.id }, data: { isVerified: true, verifiedAt: new Date() } });
          break;
        }
        case "COACH": {
          const coach = await tx.coachProfile.findFirst({
            where: { userId: request.applicantId },
            select: { id: true },
          });
          if (coach) await tx.coachProfile.update({ where: { id: coach.id }, data: { isVerified: true, verifiedAt: new Date() } });
          break;
        }
        case "SELLER": {
          const seller = await tx.sellerProfile.findFirst({
            where: { userId: request.applicantId },
            select: { userId: true },
          });
          if (seller) await tx.sellerProfile.update({ where: { userId: seller.userId }, data: { isVerified: true, verifiedAt: new Date() } });
          break;
        }
        case "ORGANIZER":
        default:
          await tx.user.update({ where: { id: request.applicantId }, data: { role: "ORGANIZER" } });
          break;
      }
    }

    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: `VERIFICATION_${decision}`,
        targetType: "VERIFICATION_REQUEST",
        targetId: requestId,
        reason: note ?? null,
      },
    });
  });

  await NotificationService.send({
    userId: request.applicantId,
    type: "VERIFICATION_RESULT",
    category: "SOCIAL",
    title: decision === "APPROVED" ? "Your verification was approved" : "Verification update",
    body: decision === "APPROVED" ? "Your profile now shows a verification badge." : (note ?? "Please submit more detail."),
    data: { requestId },
    actorId: admin.id,
  });

  revalidatePath("/admin/verification");
  return { success: `Request ${decision.toLowerCase().replace(/_/g, " ")}.` };
}

// --- Admin: settings (§63) -------------------------------------------------

export async function toggleFeatureFlagAction(key: string, enabled: boolean): Promise<SettingsState> {
  const admin = await requireAdmin();
  if (!(FEATURE_FLAGS as readonly string[]).includes(key)) return { error: "Unknown feature flag." };

  await setFeatureFlag(key as FeatureFlagKey, enabled);
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: "FEATURE_FLAG_UPDATED",
      targetType: "FEATURE_FLAG",
      targetId: key,
      metadata: { enabled },
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { success: `${key} ${enabled ? "enabled" : "disabled"}.` };
}

// --- Events: organiser CRUD (§27) -----------------------------------------

export async function createEventAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  if (!["ORGANIZER", "ADMIN", "CLUB_ADMIN"].includes(user.role)) {
    throw new AuthorizationError("Only organisers can create events.");
  }

  const parsed = eventCreateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    courtId: formData.get("courtId") || undefined,
    clubId: formData.get("clubId") || undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    capacity: formData.get("capacity") || undefined,
    cost: formData.get("cost") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
  });
  if (!parsed.success) return firstError(parsed.error);
  const input = parsed.data;

  const startsAt = fromNepalParts(input.date, input.startTime);
  const endsAt = fromNepalParts(input.date, input.endTime);
  if (endsAt <= startsAt) return { error: "End time must be after start time." };
  if (startsAt <= new Date()) return { error: "Choose a future date." };

  const slug = await uniqueSlug(input.title, async (candidate) => {
    const existing = await prisma.event.findUnique({ where: { slug: candidate }, select: { id: true } });
    return !!existing;
  });

  await prisma.event.create({
    data: {
      slug,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      venue: input.venue,
      city: input.city as never,
      startsAt,
      endsAt,
      capacity: input.capacity ?? null,
      cost: input.cost ?? null,
      imageUrl: input.imageUrl || null,
      courtId: input.courtId ?? null,
      clubId: input.clubId ?? null,
      organizerId: user.id,
    },
  });

  revalidatePath("/events");
  redirect("/events");
}
