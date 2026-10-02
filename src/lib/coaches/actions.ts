"use server";

/** Coach lesson requests (§44). Requests go to the coach, not to a payment flow. */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { NotFoundError, requireUser } from "@/lib/auth/permissions";
import { NotificationService } from "@/lib/notifications/service";

export type LessonRequestState = { error?: string; success?: string };

export async function requestLessonAction(
  input: { coachId: string; message: string; preferredDate: string },
): Promise<LessonRequestState> {
  const user = await requireUser();

  if (input.message.trim().length < 10) {
    return { error: "Tell the coach a little more about what you want (10+ characters)." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.preferredDate)) {
    return { error: "Choose a preferred date." };
  }

  const coach = await prisma.coachProfile.findUnique({
    where: { id: input.coachId },
    select: { id: true, userId: true, slug: true },
  });
  if (!coach) throw new NotFoundError("Coach not found.");
  if (coach.userId === user.id) return { error: "You cannot book yourself." };

  await prisma.lessonRequest.create({
    data: {
      coachId: coach.id,
      requesterId: user.id,
      message: input.message.trim().slice(0, 1000),
      preferredDate: new Date(input.preferredDate),
    },
  });

  await NotificationService.send({
    userId: coach.userId,
    type: "SYSTEM",
    category: "EVENT",
    title: "New lesson request",
    body: `${user.fullName} asked for a lesson on ${input.preferredDate}.`,
    data: { coachId: coach.id },
    actorId: user.id,
  });

  revalidatePath(`/coaches/${coach.slug}`);
  return { success: "Your request has been sent. The coach will message you." };
}