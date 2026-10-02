"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { toggleEventAttendanceAction } from "@/lib/social/actions";

export function EventAttendButton({
  eventId,
  isAttending,
  isSignedIn,
  isCancelled,
  isFull,
}: {
  eventId: string;
  isAttending: boolean;
  isSignedIn: boolean;
  isCancelled: boolean;
  isFull: boolean;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [attending, setAttending] = useState(isAttending);

  if (!isSignedIn) {
    return (
      <div>
        <p className="text-sm font-semibold text-ink">Want to come?</p>
        <Button className="mt-3 w-full" onClick={() => router.push(`/login?next=/events`)}>
          Log in to attend
        </Button>
      </div>
    );
  }

  const run = async () => {
    setBusy(true);
    try {
      const result = await toggleEventAttendanceAction(eventId);
      if (result.error) push(result.error, "error");
      else {
        setAttending((current) => !current);
        if (result.success) push(result.success);
        router.refresh();
      }
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  if (isCancelled) {
    return <p className="text-sm font-medium text-red-700">This event has been cancelled.</p>;
  }

  return (
    <div>
      {attending ? (
        <>
          <p className="text-sm font-semibold text-brand-800">You are going.</p>
          <Button variant="secondary" className="mt-3 w-full" disabled={busy} onClick={run}>
            {busy ? "Updating…" : "Cancel attendance"}
          </Button>
        </>
      ) : isFull ? (
        <>
          <p className="text-sm font-semibold text-ink">This event is full</p>
          <Button className="mt-3 w-full" disabled>
            Join waitlist at the venue
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink">Want to come?</p>
          <Button className="mt-3 w-full" disabled={busy} onClick={run}>
            {busy ? "Saving…" : "Attend"}
          </Button>
        </>
      )}
    </div>
  );
}