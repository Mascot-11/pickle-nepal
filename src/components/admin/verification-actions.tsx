"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { decideVerificationAction } from "@/lib/settings/actions";

export function VerificationActions({ requestId }: { requestId: string }) {
  const { push } = useToast();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (decision: "APPROVED" | "REJECTED" | "MORE_INFORMATION_REQUIRED") => {
    setBusy(decision);
    try {
      const result = await decideVerificationAction(requestId, decision, note || undefined);
      if (result.error) push(result.error, "error");
      else if (result.success) push(result.success);
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note to the applicant (optional)"
        maxLength={400}
        className="w-full rounded-lg border border-line px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy !== null} onClick={() => run("APPROVED")}>
          {busy === "APPROVED" ? "Approving…" : "Approve"}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run("MORE_INFORMATION_REQUIRED")}>
          Ask for more info
        </Button>
        <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => run("REJECTED")}>
          Reject
        </Button>
      </div>
    </div>
  );
}