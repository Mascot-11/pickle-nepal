"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createPostAction, type SocialState } from "@/lib/social/actions";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { POST_TYPES } from "@/lib/nepal";
import type { SessionUser } from "@/lib/auth/session";

export function PostComposer({ viewer }: { viewer: SessionUser }) {
  const [state, formAction, pending] = useActionState(createPostAction, {} as SocialState);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-4">
        <Avatar name={viewer.fullName} src={viewer.avatarUrl} size={40} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-brand-50"
        >
          Share something with the community…
        </button>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        await formAction(new FormData());
        router.refresh();
      }}
      className="space-y-3 rounded-2xl border border-line bg-surface-raised p-5"
    >
      <div className="flex items-center gap-3">
        <Avatar name={viewer.fullName} src={viewer.avatarUrl} size={40} />
        <p className="text-sm font-semibold text-ink">Posting as {viewer.fullName}</p>
      </div>

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

      <div>
        <label htmlFor="post-content" className="sr-only">
          Post content
        </label>
        <textarea
          id="post-content"
          name="content"
          required
          maxLength={4000}
          rows={4}
          placeholder="Looking for a doubles partner in Lalitpur this weekend…"
          className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="post-type" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Type
          </label>
          <select id="post-type" name="type" className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm">
            {POST_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="post-link" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Link (optional)
          </label>
          <input
            id="post-link"
            name="linkUrl"
            type="url"
            placeholder="https://"
            className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-soft">Keep it useful and respectful.</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </form>
  );
}