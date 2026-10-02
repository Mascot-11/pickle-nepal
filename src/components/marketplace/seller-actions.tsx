"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { deleteListingAction, toggleSaveAction } from "@/lib/social/actions";
import { startConversationAction } from "@/lib/social/actions";

export function SellerActions({
  listingId,
  sellerId,
  isOwner,
  isSignedIn,
  isSaved,
  isSold,
}: {
  listingId: string;
  sellerId: string;
  isOwner: boolean;
  isSignedIn: boolean;
  isSaved: boolean;
  isSold: boolean;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [saved, setSaved] = useState(isSaved);
  const [busy, setBusy] = useState(false);

  const run = async (key: string, fn: () => Promise<{ error?: string; success?: string }>, onOk?: () => void) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result.error) push(result.error, "error");
      else {
        if (result.success) push(result.success);
        onOk?.();
        router.refresh();
      }
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  if (isOwner) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink-soft">This is your listing.</p>
        <form
          action={async () => {
            await run("delete", () => deleteListingAction(listingId));
          }}
        >
          <Button type="submit" variant="danger" className="w-full" disabled={busy}>
            {busy ? "Removing…" : "Delete listing"}
          </Button>
        </form>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <Button className="w-full" onClick={() => router.push("/login?next=/marketplace")}>
        Log in to contact the seller
      </Button>
    );
  }

  if (isSold) {
    return <p className="text-sm font-medium text-ink-soft">This item has been sold.</p>;
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={busy}
        onClick={() => run("message", () => startConversationAction(sellerId))}
      >
        Contact seller
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        aria-pressed={saved}
        onClick={() =>
          run(
            "save",
            async () => {
              const result = await toggleSaveAction(listingId, "LISTING");
              if (!result.error) setSaved((current) => !current);
              return result;
            },
          )
        }
      >
        {saved ? "🔖 Saved" : "🔖 Save listing"}
      </Button>
    </div>
  );
}