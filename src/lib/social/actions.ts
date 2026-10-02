"use server";

/**
 * Player, follow, comment, post, review, report and messaging actions.
 * Every mutation authenticates, authorizes, validates, then writes (§71).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  isBlockedEitherWay,
  isStaff,
  requireUser,
} from "@/lib/auth/permissions";
import {
  commentCreateSchema,
  listingCreateSchema,
  messageSchema,
  postCreateSchema,
  reportSchema,
  reviewCreateSchema,
} from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { NotificationService } from "@/lib/notifications/service";
import { track } from "@/lib/analytics";
import { uniqueSlug } from "@/lib/slug";

export type SocialState = { error?: string; success?: string; fieldErrors?: Record<string, string[]> };

function firstError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): SocialState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: Object.values(fieldErrors)[0]?.[0] ?? "Please check the form.", fieldErrors };
}

// --- Following (§38) -------------------------------------------------------

export async function toggleFollowAction(targetUserId: string): Promise<SocialState> {
  const user = await requireUser();
  if (user.id === targetUserId) return { error: "You cannot follow yourself." };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, fullName: true, username: true },
  });
  if (!target) throw new NotFoundError("Player not found.");

  if (await isBlockedEitherWay(user.id, targetUserId)) {
    return { error: "You cannot follow this player." };
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetUserId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    revalidatePath(`/players/${target.username}`);
    return { success: `You unfollowed ${target.fullName}` };
  }

  await prisma.follow.create({
    data: { followerId: user.id, followingId: targetUserId },
  });
  await NotificationService.send({
    userId: targetUserId,
    type: "FOLLOW",
    category: "SOCIAL",
    title: `${user.fullName} started following you`,
    body: "Tap to see their profile and upcoming games.",
    data: { userId: user.id },
    actorId: user.id,
  });

  revalidatePath(`/players/${target.username}`);
  return { success: `You are now following ${target.fullName}` };
}

// --- Community posts (§36, §37) --------------------------------------------

export async function createPostAction(
  _prev: SocialState,
  formData: FormData,
): Promise<SocialState> {
  const user = await requireUser();
  const limited = await rateLimit("post", user.id);
  if (!limited.ok) return { error: "You are posting too quickly. Try again in a minute." };

  const parsed = postCreateSchema.safeParse({
    content: formData.get("content"),
    type: formData.get("type") ?? "GENERAL",
    images: formData.getAll("images").map(String).filter(Boolean),
    linkUrl: formData.get("linkUrl") || undefined,
  });
  if (!parsed.success) return firstError(parsed.error);

  const post = await prisma.communityPost.create({
    data: {
      content: parsed.data.content,
      type: parsed.data.type,
      images: parsed.data.images,
      linkUrl: parsed.data.linkUrl || null,
      authorId: user.id,
    },
    select: { id: true },
  });

  await track({ name: "POST_CREATED", userId: user.id, entityType: "post", entityId: post.id });
  revalidatePath("/community");
  revalidatePath("/");
  return { success: "Your post has been published." };
}

export async function updatePostAction(postId: string, formData: FormData): Promise<SocialState> {
  const user = await requireUser();
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { authorId: true, isHidden: true },
  });
  if (!post) throw new NotFoundError("Post not found.");
  if (post.authorId !== user.id && !isStaff(user)) {
    throw new AuthorizationError("You can only edit your own posts.");
  }

  const content = String(formData.get("content") ?? "").trim();
  if (content.length < 1 || content.length > 4000) {
    return { error: "Posts must be between 1 and 4000 characters." };
  }

  await prisma.communityPost.update({
    where: { id: postId },
    data: { content, editedAt: new Date() },
  });

  revalidatePath(`/community/${postId}`);
  return { success: "Post updated." };
}

export async function deletePostAction(postId: string): Promise<SocialState> {
  const user = await requireUser();
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) throw new NotFoundError("Post not found.");
  if (post.authorId !== user.id && !isStaff(user)) {
    throw new AuthorizationError("You can only delete your own posts.");
  }

  // Soft delete so moderation history and report context survive.
  await prisma.communityPost.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  redirect("/community");
}

export async function togglePostLikeAction(postId: string): Promise<SocialState> {
  const user = await requireUser();
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { authorId: true, isHidden: true, deletedAt: true },
  });
  if (!post || post.deletedAt || post.isHidden) throw new NotFoundError("Post not found.");
  if (await isBlockedEitherWay(user.id, post.authorId)) {
    return { error: "You cannot interact with this post." };
  }

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    revalidatePath(`/community/${postId}`);
    return { success: "Like removed" };
  }

  await prisma.like.create({ data: { userId: user.id, postId } });
  await NotificationService.send({
    userId: post.authorId,
    type: "LIKE",
    category: "SOCIAL",
    title: `${user.fullName} liked your post`,
    body: postId,
    data: { postId },
    actorId: user.id,
  });

  await track({ name: "POST_LIKED", userId: user.id, entityType: "post", entityId: postId });
  revalidatePath(`/community/${postId}`);
  return { success: "Liked" };
}

export async function toggleSaveAction(itemId: string, itemType: "POST" | "LISTING"): Promise<SocialState> {
  const user = await requireUser();

  if (itemType === "POST") {
    const existing = await prisma.savedItem.findFirst({
      where: { userId: user.id, type: "POST", postId: itemId },
      select: { id: true },
    });
    if (existing) {
      await prisma.savedItem.delete({ where: { id: existing.id } });
      return { success: "Removed from saved" };
    }
    await prisma.savedItem.create({ data: { userId: user.id, type: "POST", postId: itemId } });
    return { success: "Saved" };
  }

  const existing = await prisma.savedItem.findFirst({
    where: { userId: user.id, type: "LISTING", listingId: itemId },
    select: { id: true },
  });
  if (existing) {
    await prisma.savedItem.delete({ where: { id: existing.id } });
    return { success: "Removed from saved" };
  }
  await prisma.savedItem.create({ data: { userId: user.id, type: "LISTING", listingId: itemId } });
  return { success: "Saved" };
}

export async function createCommentAction(
  postId: string,
  formData: FormData,
): Promise<SocialState> {
  const user = await requireUser();
  const limited = await rateLimit("comment", user.id);
  if (!limited.ok) return { error: "You are commenting too quickly." };

  const parsed = commentCreateSchema.safeParse({
    content: formData.get("content"),
    parentId: formData.get("parentId") || undefined,
  });
  if (!parsed.success) return firstError(parsed.error);

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, deletedAt: true, isHidden: true },
  });
  if (!post || post.deletedAt || post.isHidden) throw new NotFoundError("Post not found.");
  if (await isBlockedEitherWay(user.id, post.authorId)) {
    return { error: "You cannot comment on this post." };
  }

  // Controlled nesting: replies attach to a top-level comment only (§39).
  let depth = 0;
  let parentId: string | null = null;
  if (parsed.data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, postId: true, depth: true, parentId: true },
    });
    if (!parent || parent.postId !== postId) return { error: "That comment no longer exists." };
    if (parent.parentId) return { error: "Replies can only be added to top-level comments." };
    depth = 1;
    parentId = parent.id;
  }

  const comment = await prisma.comment.create({
    data: { postId, authorId: user.id, content: parsed.data.content, parentId, depth },
    select: { id: true, authorId: true },
  });

  if (comment.authorId !== post.authorId) {
    await NotificationService.send({
      userId: post.authorId,
      type: "COMMENT",
      category: "SOCIAL",
      title: `${user.fullName} commented on your post`,
      body: parsed.data.content.slice(0, 120),
      data: { postId },
      actorId: user.id,
    });
  }

  revalidatePath(`/community/${postId}`);
  return { success: "Reply posted." };
}

export async function deleteCommentAction(commentId: string): Promise<SocialState> {
  const user = await requireUser();
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true },
  });
  if (!comment) throw new NotFoundError("Comment not found.");
  if (comment.authorId !== user.id && !isStaff(user)) {
    throw new AuthorizationError("You can only delete your own comments.");
  }

  await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  revalidatePath(`/community/${comment.postId}`);
  return { success: "Comment removed." };
}

// --- Reviews (§45) ---------------------------------------------------------

export async function createReviewAction(
  _prev: SocialState,
  formData: FormData,
): Promise<SocialState> {
  const user = await requireUser();
  const limited = await rateLimit("review", user.id);
  if (!limited.ok) return { error: "You have reviewed a lot recently. Try again tomorrow." };

  const parsed = reviewCreateSchema.safeParse({
    subjectType: formData.get("subjectType"),
    courtId: formData.get("courtId") || undefined,
    coachId: formData.get("coachId") || undefined,
    rating: formData.get("rating"),
    comment: formData.get("comment"),
    facilities: formData.get("facilities") || undefined,
    courtQuality: formData.get("courtQuality") || undefined,
    staffRating: formData.get("staffRating") || undefined,
    valueRating: formData.get("valueRating") || undefined,
  });
  if (!parsed.success) return firstError(parsed.error);

  const input = parsed.data;

  const existing = await prisma.review.findFirst({
    where: {
      reviewerId: user.id,
      status: "VISIBLE",
      ...(input.courtId ? { courtId: input.courtId } : {}),
      ...(input.coachId ? { coachId: input.coachId } : {}),
      subjectType: input.subjectType,
    },
    select: { id: true },
  });
  if (existing) return { error: "You have already reviewed this." };

  const { subjectType, rating, comment, ...rest } = input;

  await prisma.review.create({
    data: {
      subjectType: subjectType as never,
      rating,
      comment,
      facilities: rest.facilities ?? null,
      courtQuality: rest.courtQuality ?? null,
      staffRating: rest.staffRating ?? null,
      valueRating: rest.valueRating ?? null,
      reviewerId: user.id,
      courtId: rest.courtId ?? null,
      coachId: rest.coachId ?? null,
    },
  });

  revalidatePath("/courts");
  return { success: "Thanks for your review." };
}

// --- Reports (§58, §84) ----------------------------------------------------

export async function createReportAction(formData: FormData): Promise<SocialState> {
  const user = await requireUser();
  const limited = await rateLimit("report", user.id);
  if (!limited.ok) return { error: "You have sent a lot of reports recently." };

  const parsed = reportSchema.safeParse({
    reason: formData.get("reason"),
    details: formData.get("details") || undefined,
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
  });
  if (!parsed.success) return firstError(parsed.error);

  const input = parsed.data;
  const targetIdField = {
    USER: "targetUserId",
    POST: "postId",
    COMMENT: "commentId",
    GAME: "gameId",
    COURT: "courtId",
    CLUB: "clubId",
    EVENT: "eventId",
    TOURNAMENT: "tournamentId",
    REVIEW: "reviewId",
    LISTING: "listingId",
    MESSAGE: "messageId",
  }[input.targetType];

  // Verify the target actually exists before recording the report.
  const exists = await prisma.$transaction(async (tx) => {
    switch (input.targetType) {
      case "USER":
        return !!tx.user.findUnique({ where: { id: input.targetId }, select: { id: true } });
      case "POST":
        return !!tx.communityPost.findUnique({ where: { id: input.targetId }, select: { id: true } });
      case "COMMENT":
        return !!tx.comment.findUnique({ where: { id: input.targetId }, select: { id: true } });
      case "COURT":
        return !!tx.court.findUnique({ where: { id: input.targetId }, select: { id: true } });
      case "REVIEW":
        return !!tx.review.findUnique({ where: { id: input.targetId }, select: { id: true } });
      default:
        return true;
    }
  });

  if (!exists) throw new NotFoundError("That content no longer exists.");

  await prisma.report.create({
    data: {
      reporterId: user.id,
      reason: input.reason as never,
      details: input.details ?? null,
      targetType: input.targetType as never,
      [targetIdField]: input.targetId,
    } as never,
  });

  return { success: "Thanks — our team will review this." };
}

export async function blockUserAction(targetUserId: string): Promise<SocialState> {
  const user = await requireUser();
  if (user.id === targetUserId) return { error: "You cannot block yourself." };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { username: true },
  });
  if (!target) throw new NotFoundError("Player not found.");

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetUserId } },
    create: { blockerId: user.id, blockedId: targetUserId },
    update: {},
  });

  revalidatePath(`/players/${target.username}`);
  return { success: "Blocked. You will not see each other's content." };
}

export async function unblockUserAction(targetUserId: string): Promise<SocialState> {
  const user = await requireUser();
  await prisma.block.deleteMany({ where: { blockerId: user.id, blockedId: targetUserId } });
  return { success: "Unblocked." };
}

// --- Messaging (§41) -------------------------------------------------------

/** Opens (or reuses) a conversation with another user. */
export async function startConversationAction(targetUserId: string): Promise<SocialState> {
  const user = await requireUser();
  if (user.id === targetUserId) return { error: "You cannot message yourself." };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, fullName: true, status: true },
  });
  if (!target || target.status !== "ACTIVE") throw new NotFoundError("Player not found.");

  if (await isBlockedEitherWay(user.id, targetUserId)) {
    return { error: "Messaging is not available between you." };
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { userId: targetUserId } } },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    redirect(`/messages/${existing.id}`);
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: { create: [{ userId: user.id }, { userId: targetUserId }] },
    },
    select: { id: true },
  });

  redirect(`/messages/${conversation.id}`);
}

export async function sendMessageAction(
  conversationId: string,
  formData: FormData,
): Promise<SocialState> {
  const user = await requireUser();
  const limited = await rateLimit("message", user.id);
  if (!limited.ok) return { error: "You are sending messages too quickly." };

  const membership = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { conversationId: true },
  });
  if (!membership) throw new AuthorizationError("You are not part of this conversation.");

  const parsed = messageSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) return firstError(parsed.error);

  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: user.id } },
    select: { userId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: { conversationId, senderId: user.id, content: parsed.data.content },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    for (const other of others) {
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: other.userId } },
        data: { unreadCount: { increment: 1 } },
      });
      await tx.notification.create({
        data: {
          userId: other.userId,
          type: "MESSAGE",
          category: "MESSAGE",
          title: `New message from ${user.fullName}`,
          body: parsed.data.content.slice(0, 120),
          data: { conversationId },
        },
      });
    }
  });

  await track({ name: "MESSAGE_SENT", userId: user.id, entityType: "conversation", entityId: conversationId });
  revalidatePath(`/messages/${conversationId}`);
  return { success: "Sent." };
}

export async function markConversationReadAction(conversationId: string): Promise<void> {
  const user = await requireUser();
  const membership = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { conversationId: true },
  });
  if (!membership) return;

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    data: { unreadCount: 0, lastReadAt: new Date() },
  });
  revalidatePath("/messages");
}

// --- Events (§27) ----------------------------------------------------------

export async function toggleEventAttendanceAction(eventId: string): Promise<SocialState> {
  const user = await requireUser();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, startsAt: true, isCancelled: true, capacity: true, title: true },
  });
  if (!event || event.isCancelled) throw new NotFoundError("Event not found.");
  if (event.startsAt <= new Date()) return { error: "This event has already started." };

  const existing = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
    select: { id: true },
  });

  if (existing) {
    await prisma.eventParticipant.delete({ where: { id: existing.id } });
    await prisma.playerProfile.update({
      where: { userId: user.id },
      data: { eventsAttended: { decrement: 1 } },
    });
    revalidatePath(`/events/${eventId}`);
    return { success: "You are no longer attending." };
  }

  if (event.capacity) {
    const count = await prisma.eventParticipant.count({ where: { eventId } });
    if (count >= event.capacity) return { error: "This event is full." };
  }

  await prisma.eventParticipant.create({ data: { eventId, userId: user.id } });
  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { eventsAttended: { increment: 1 } },
  });

  revalidatePath(`/events/${eventId}`);
  return { success: "You're going!" };
}

// --- Tournament registration (§29) -----------------------------------------

export async function registerForTournamentAction(formData: FormData): Promise<SocialState> {
  const user = await requireUser();
  const limited = await rateLimit("tournamentRegistration", user.id);
  if (!limited.ok) return { error: "Too many registration attempts. Try again later." };

  const tournamentId = String(formData.get("tournamentId"));
  const categoryId = String(formData.get("categoryId"));
  const partnerId = String(formData.get("partnerId") || "") || undefined;
  const teamName = String(formData.get("teamName") || "").trim() || undefined;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      status: true,
      registrationDeadline: true,
      maxParticipants: true,
      entryFee: true,
    },
  });
  if (!tournament) throw new NotFoundError("Tournament not found.");
  if (!["REGISTRATION_OPEN", "UPCOMING"].includes(tournament.status)) {
    return { error: "Registration is not open for this tournament." };
  }
  if (tournament.registrationDeadline <= new Date()) {
    return { error: "The registration deadline has passed." };
  }

  const category = await prisma.tournamentCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, tournamentId: true, name: true, maxEntries: true, format: true },
  });
  if (!category || category.tournamentId !== tournamentId) {
    return { error: "That category does not belong to this tournament." };
  }

  const isDoubles = category.format === "DOUBLES";

  if (isDoubles && !partnerId) {
    return { fieldErrors: { partnerId: ["Choose a doubles partner"] }, error: "Choose a doubles partner." };
  }
  if (partnerId && partnerId === user.id) {
    return { error: "You cannot partner with yourself." };
  }

  const duplicate = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_categoryId_userId: {
        tournamentId,
        categoryId,
        userId: user.id,
      },
    },
    select: { id: true },
  });
  if (duplicate) return { error: "You are already registered in this category." };

  if (category.maxEntries) {
    const count = await prisma.tournamentParticipant.count({ where: { categoryId } });
    if (count >= category.maxEntries) {
      return { error: "This category is full." };
    }
  }

  if (tournament.maxParticipants) {
    const total = await prisma.tournamentParticipant.count({ where: { tournamentId } });
    if (total >= tournament.maxParticipants) {
      return { error: "This tournament has reached its participant limit." };
    }
  }

  if (partnerId) {
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, fullName: true, status: true },
    });
    if (!partner || partner.status !== "ACTIVE") {
      return { error: "That partner could not be found." };
    }
    const partnerDuplicate = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_categoryId_userId: {
          tournamentId,
          categoryId,
          userId: partnerId,
        },
      },
      select: { id: true },
    });
    if (partnerDuplicate) return { error: `${partner.fullName} is already registered in this category.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentParticipant.create({
      data: { tournamentId, categoryId, userId: user.id, paidAt: null },
    });

    if (isDoubles && partnerId) {
      // Doubles teams are an explicit entity (§29).
      await tx.tournamentTeam.create({
        data: {
          tournamentId,
          categoryId,
          name: teamName ?? null,
          createdById: user.id,
          members: {
            create: [
              { playerId: user.id, position: 1 },
              { playerId: partnerId, position: 2 },
            ],
          },
        },
      });
      await tx.tournamentParticipant.create({
        data: { tournamentId, categoryId, userId: partnerId!, paidAt: null },
      });
    }
  });

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { tournamentsPlayed: { increment: 1 } },
  });

  await track({
    name: "TOURNAMENT_REGISTERED",
    userId: user.id,
    entityType: "tournament",
    entityId: tournamentId,
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
  return {
    success: tournament.entryFee > 0
      ? "You're registered. Entry fee is settled with the organiser."
      : "You're registered!",
  };
}

export async function withdrawFromTournamentAction(formData: FormData): Promise<SocialState> {
  const user = await requireUser();
  const tournamentId = String(formData.get("tournamentId"));

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true },
  });
  if (!tournament) throw new NotFoundError("Tournament not found.");
  if (!["REGISTRATION_OPEN", "UPCOMING"].includes(tournament.status)) {
    return { error: "Registration has closed for this tournament." };
  }

  const removed = await prisma.$transaction(async (tx) => {
    const registrations = await tx.tournamentParticipant.findMany({
      where: { tournamentId, userId: user.id },
      select: { id: true, categoryId: true },
    });
    if (registrations.length === 0) return 0;

    const categoryIds = registrations.map((r) => r.categoryId);
    await tx.tournamentTeam.deleteMany({ where: { tournamentId, categoryId: { in: categoryIds } } });
    await tx.tournamentParticipant.deleteMany({ where: { tournamentId, userId: user.id } });
    return registrations.length;
  });

  if (removed === 0) return { error: "You are not registered for this tournament." };

  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: { tournamentsPlayed: { decrement: 1 } },
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: "Your registration has been withdrawn." };
}

// --- Marketplace (§46) -----------------------------------------------------

export async function createListingAction(
  _prev: SocialState,
  formData: FormData,
): Promise<SocialState> {
  const user = await requireUser();

  const parsed = listingSchemaFrom(formData);
  if (!parsed.success) return firstError(parsed.error);
  const input = parsed.data;

  const slug = await uniqueSlug(input.title, async (candidate) => {
    const existing = await prisma.marketplaceListing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return !!existing;
  });

  await prisma.marketplaceListing.create({
    data: {
      slug,
      title: input.title,
      description: input.description,
      price: input.price,
      category: input.category,
      condition: input.condition,
      city: input.city as never,
      images: input.images,
      isNegotiable: input.isNegotiable,
      sellerId: user.id,
    },
  });

  revalidatePath("/marketplace");
  return { success: "Your listing is live." };
}

function listingSchemaFrom(formData: FormData) {
  return listingCreateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    category: formData.get("category"),
    condition: formData.get("condition"),
    city: formData.get("city"),
    images: formData.getAll("images").map(String).filter(Boolean),
    isNegotiable: formData.get("isNegotiable") === "on",
  });
}

export async function updateListingAction(formData: FormData): Promise<SocialState> {
  const user = await requireUser();
  const listingId = String(formData.get("listingId"));

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, slug: true },
  });
  if (!listing) throw new NotFoundError("Listing not found.");
  if (listing.sellerId !== user.id) {
    throw new AuthorizationError("You can only edit your own listings.");
  }

  const price = Number(formData.get("price"));
  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a valid price." };

  await prisma.marketplaceListing.update({
    where: { id: listingId },
    data: {
      price,
      description: String(formData.get("description") ?? "").slice(0, 3000),
      status: (String(formData.get("status") ?? "ACTIVE") as "ACTIVE" | "SOLD" | "ARCHIVED"),
    },
  });

  revalidatePath(`/marketplace/${listing.slug}`);
  return { success: "Listing updated." };
}

export async function deleteListingAction(listingId: string): Promise<SocialState> {
  const user = await requireUser();
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  });
  if (!listing) throw new NotFoundError("Listing not found.");
  if (listing.sellerId !== user.id) throw new AuthorizationError("You can only delete your own listings.");

  await prisma.marketplaceListing.update({ where: { id: listingId }, data: { deletedAt: new Date() } });
  revalidatePath("/marketplace");
  return { success: "Listing removed." };
}
