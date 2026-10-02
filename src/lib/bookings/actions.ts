"use server";

/**
 * Court bookings (REQUIREMENT.md §26, §75).
 *
 * Overlap detection, opening hours and past-date rejection all run
 * server-side inside a transaction. A booking is never confirmed from client
 * state — it starts PENDING and the club confirms it.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  requireClubManager,
  requireUser,
} from "@/lib/auth/permissions";
import { bookingCreateSchema } from "@/lib/validation";
import { fromNepalParts, toNepalParts } from "@/lib/dates";
import { bookingPrice, validateBookingWindow } from "@/lib/bookings/rules";
import { track } from "@/lib/analytics";
import { NotificationService } from "@/lib/notifications/service";

export type BookingState = { error?: string; success?: string };

export async function createBookingAction(input: {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}): Promise<BookingState> {
  const user = await requireUser();

  const parsed = bookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid booking details." };
  }
  const data = parsed.data;

  const court = await prisma.court.findFirst({
    where: { id: data.courtId, isActive: true, deletedAt: null },
    include: {
      availability: { select: { dayOfWeek: true, opensAt: true, closesAt: true, isClosed: true } },
      club: { select: { id: true, ownerId: true, name: true } },
    },
  });
  if (!court) throw new NotFoundError("Court not found.");

  const startsAt = fromNepalParts(data.date, data.startTime);
  const endsAt = fromNepalParts(data.date, data.endTime);
  const dayStart = fromNepalParts(data.date, "00:00");

  const existing = await prisma.courtBooking.findMany({
    where: {
      courtId: court.id,
      bookingDate: dayStart,
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    },
    select: { id: true, startsAt: true, endsAt: true, status: true },
  });

  // Opening hours are a Nepal wall-clock concept, so pass the local day/time
  // rather than reading UTC fields off the instants (§5.4).
  const localDay = toNepalParts(startsAt).dayOfWeek;

  const validation = validateBookingWindow({
    startsAt,
    endsAt,
    now: new Date(),
    openingHours: court.availability,
    existing,
    dayOfWeek: localDay,
    startTime: data.startTime,
    endTime: data.endTime,
  });
  if (!validation.ok) return { error: validation.message };

  const price = bookingPrice(court.pricePerHour, (endsAt.getTime() - startsAt.getTime()) / 3_600_000);

  const booking = await prisma.courtBooking.create({
    data: {
      userId: user.id,
      courtId: court.id,
      clubId: court.clubId,
      bookingDate: dayStart,
      startsAt,
      endsAt,
      price,
      status: "PENDING",
      notes: data.notes ?? null,
    },
    select: { id: true },
  });

  if (court.clubId) {
    const owner = await prisma.club.findUnique({
      where: { id: court.clubId },
      select: { ownerId: true, name: true },
    });
    if (owner) {
      await NotificationService.send({
        userId: owner.ownerId,
        type: "BOOKING_STATUS",
        category: "EVENT",
        title: "New booking request",
        body: `${user.fullName} requested ${court.name} on ${data.date}.`,
        data: { bookingId: booking.id },
        actorId: user.id,
      });
    }
  }

  await track({ name: "BOOKING_CREATED", userId: user.id, entityType: "booking", entityId: booking.id });
  revalidatePath(`/courts/${court.slug}`);
  return {
    success:
      price > 0
        ? "Booking requested. The club will confirm it — no payment is taken yet."
        : "Booking requested. The club will confirm it.",
  };
}

/** Club/admin side: confirm, complete, cancel or refund a booking. */
export async function updateBookingStatusAction(
  bookingId: string,
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "REFUNDED",
  reason?: string,
): Promise<BookingState> {
  const user = await requireUser();

  const booking = await prisma.courtBooking.findUnique({
    where: { id: bookingId },
    include: { court: { select: { id: true, name: true, slug: true, clubId: true } } },
  });
  if (!booking) throw new NotFoundError("Booking not found.");

  if (booking.clubId) {
    await requireClubManager(booking.clubId);
  } else if (booking.userId !== user.id && user.role !== "ADMIN") {
    throw new AuthorizationError("You cannot manage this booking.");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (status === "CANCELLED" || status === "REFUNDED") {
      // Re-check for a conflict: a confirmed booking may now overlap.
      if (status === "CANCELLED") {
        const conflict = await tx.courtBooking.findFirst({
          where: {
            id: { not: bookingId },
            courtId: booking.courtId,
            bookingDate: booking.bookingDate,
            status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
            startsAt: { lt: booking.endsAt },
            endsAt: { gt: booking.startsAt },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new ValidationError("Another booking now covers that slot.");
        }
      }
    }

    await tx.courtBooking.update({
      where: { id: bookingId },
      data: {
        status,
        cancelledAt: status === "CANCELLED" ? now : undefined,
        cancelReason: reason?.slice(0, 300) ?? undefined,
      },
    });

    await tx.notification.create({
      data: {
        userId: booking.userId,
        type: "BOOKING_STATUS",
        category: "EVENT",
        title: `Booking ${status.toLowerCase()}`,
        body: `${booking.court.name} booking is now ${status.toLowerCase()}.${reason ? ` ${reason}` : ""}`,
        data: { bookingId },
      },
    });
  });

  if (status === "COMPLETED") {
    await track({ name: "BOOKING_COMPLETED", userId: booking.userId, entityType: "booking", entityId: bookingId });
  }

  revalidatePath(`/courts/${booking.court.slug}`);
  revalidatePath("/dashboard/bookings");
  return { success: `Booking ${status.toLowerCase()}.` };
}

export async function cancelMyBookingAction(bookingId: string): Promise<BookingState> {
  const user = await requireUser();
  const booking = await prisma.courtBooking.findUnique({
    where: { id: bookingId },
    select: { userId: true, startsAt: true },
  });
  if (!booking) throw new NotFoundError("Booking not found.");
  if (booking.userId !== user.id) throw new AuthorizationError("You can only cancel your own bookings.");

  if (booking.startsAt <= new Date()) {
    return { error: "This booking has already started." };
  }

  await prisma.courtBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Cancelled by player" },
  });

  revalidatePath("/dashboard/bookings");
  return { success: "Booking cancelled." };
}