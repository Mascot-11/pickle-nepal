"use client";

import { useActionState, useState } from "react";
import { createReviewAction, type SocialState } from "@/lib/social/actions";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/form";

const STAR_LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"] as const;

export function CourtReviewForm({ courtId, slug }: { courtId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createReviewAction, {} as SocialState);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-line bg-surface-raised p-5">
      <h3 className="font-semibold text-ink">Review this court</h3>
      <input type="hidden" name="subjectType" value="COURT" />
      <input type="hidden" name="courtId" value={courtId} />

      {state.error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800">
          {state.success}
        </p>
      ) : null}

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Overall rating</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="rating" value={value} required className="peer sr-only" />
              <span className="block rounded-xl border border-line px-3 py-2 text-sm peer-checked:border-brand-500 peer-checked:bg-brand-50 has-checked:border-brand-500 has-checked:bg-brand-50">
                {value} ★ {STAR_LABELS[value - 1]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextArea
        label="Your review"
        name="comment"
        required
        minLength={10}
        rows={3}
        maxLength={1500}
        placeholder="How was the surface, lighting, staff and value for money?"
      />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Submit review"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>

      <p className="text-xs text-ink-soft">
        One review per person. Reviews are public on{" "}
        <a href={`/courts/${slug}`} className="text-brand-700 hover:underline">
          this court page
        </a>
        .
      </p>
    </form>
  );
}