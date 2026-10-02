"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { createBookingAction } from "@/lib/bookings/actions";
import { formatPrice } from "@/lib/nepal";
import { toNepalParts } from "@/lib/dates";

/**
 * Booking panel (§26). The server re-checks availability, opening hours and
 * overlaps inside a transaction — this form only collects intent.
 */
export function BookingPanel({ courtId, pricePerHour }: { courtId: string; pricePerHour: number | null }) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(toNepalParts(new Date()).date);
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("09:00");

  const hours = (Number(end.slice(0, 2)) - Number(start.slice(0, 2))) || 0;
  const estimate = pricePerHour ? pricePerHour * Math.max(hours, 0) : null;

  const submit = async (formData: FormData) => {
    setBusy(true);
    setError(null);
    try {
      const result = await createBookingAction({
        courtId: String(formData.get("courtId")),
        date: String(formData.get("date")),
        startTime: String(formData.get("startTime")),
        endTime: String(formData.get("endTime")),
        notes: String(formData.get("notes") ?? ""),
      });
      if (result.error) {
        setError(result.error);
        push(result.error, "error");
      } else {
        push(result.success ?? "Booking requested", "success");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create the booking";
      setError(message);
      push(message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form action={submit} className="space-y-3 rounded-2xl border border-line bg-surface-raised p-5">
      <h2 className="font-semibold text-ink">Book this court</h2>
      <p className="text-sm text-ink-soft">
        {pricePerHour ? `${formatPrice(pricePerHour)} per hour` : "Set pricing with the club"}
      </p>

      <input type="hidden" name="courtId" value={courtId} />

      <Field
        label="Date"
        name="date"
        type="date"
        required
        min={toNepalParts(new Date()).date}
        value={date}
        onChangeCustom={setDate}
      />
      <div className="grid grid-cols-2 gap-2">
        <Field label="From" name="startTime" type="time" required value={start} onChangeCustom={setStart} />
        <Field label="To" name="endTime" type="time" required value={end} onChangeCustom={setEnd} />
      </div>
      <Field label="Note (optional)" name="notes" maxLength={300} />

      {estimate !== null ? (
        <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
          Estimated total: {formatPrice(estimate)}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Requesting…" : "Request booking"}
      </Button>

      <p className="text-xs text-ink-soft">
        Your booking stays unconfirmed until the club accepts it. Overlapping bookings are rejected
        automatically.
      </p>
    </form>
  );
}