"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createListingAction, type SocialState } from "@/lib/social/actions";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/form";
import { CITIES, LISTING_CATEGORIES } from "@/lib/nepal";

export function ListingComposer() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createListingAction, {} as SocialState);
  const router = useRouter();

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>Create a listing</Button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        router.refresh();
      }}
      className="mt-6 space-y-4 rounded-2xl border border-line bg-surface-raised p-5"
    >
      <h2 className="font-semibold text-ink">New listing</h2>

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

      <Field label="Title" name="title" required minLength={4} maxLength={120} />
      <TextArea label="Description" name="description" required rows={3} maxLength={3000} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Price (NPR)" name="price" type="number" min={1} required inputMode="numeric" />
        <Select
          label="Category"
          name="category"
          required
          placeholder="Choose a category"
          options={LISTING_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Condition"
          name="condition"
          required
          placeholder="Choose condition"
          options={[
            { value: "NEW", label: "New" },
            { value: "LIKE_NEW", label: "Like new" },
            { value: "GOOD", label: "Good" },
            { value: "FAIR", label: "Fair" },
            { value: "USED", label: "Used" },
          ]}
        />
        <Select
          label="City"
          name="city"
          required
          placeholder="Choose city"
          options={CITIES.map((c) => ({ value: c.value, label: c.label }))}
        />
      </div>
      <Field label="Image URL (optional)" name="images" type="url" placeholder="https://…" />

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Publishing…" : "Publish listing"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}