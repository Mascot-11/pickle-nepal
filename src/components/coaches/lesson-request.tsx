"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/form";
import { requestLessonAction } from "@/lib/coaches/actions";
import { formatPrice } from "@/lib/nepal";
import { toNepalParts, addDaysToNepalDate } from "@/lib/dates";

export function CoachLessonRequest({
  coachId,
  isSignedIn,
  price,
}: {
  coachId: string;
  isSignedIn: boolean;
  price: number | null;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState(addDaysToNepalDate(toNepalParts(new Date()).date, 2));

  if (!isSignedIn) {
    return (
      <div>
        <p className="text-sm text-ink-soft">Log in to request a lesson with this coach.</p>
        <Button className="mt-3 w-full" onClick={() => router.push("/login?next=/coaches")}>
          Log in
        </Button>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await requestLessonAction({ coachId, message, preferredDate });
      if (result.error) {
        setError(result.error);
        push(result.error, "error");
      } else {
        push(result.success ?? "Request sent", "success");
        setMessage("");
        router.refresh();
      }
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Could not send the request";
      setError(msg);
      push(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        {price ? `${formatPrice(price)} per session, arranged directly with the coach.` : "Pricing arranged with the coach."}
      </p>

      <Field
        label="Preferred date"
        name="preferredDate"
        type="date"
        value={preferredDate}
        min={addDaysToNepalDate(toNepalParts(new Date()).date, 1)}
        onChangeCustom={setPreferredDate}
      />
      <TextArea
        label="What would you like to work on?"
        name="message"
        rows={3}
        maxLength={1000}
        value={message}
        hint="10 characters minimum."

      />

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button className="w-full" disabled={busy || message.trim().length < 10} onClick={submit}>
        {busy ? "Sending…" : "Request lesson"}
      </Button>
    </div>
  );
}