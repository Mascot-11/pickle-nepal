"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { resolveReportAction } from "@/lib/settings/actions";

export function ReportActions({ reportId }: { reportId: string }) {
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const run = async (action: string) => {
    setBusy(action);
    try {
      const result = await resolveReportAction(reportId, action as never);
      if (result.error) push(result.error, "error");
      else if (result.success) push(result.success);
      setConfirming(null);
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run("DISMISS")}>
        {busy === "DISMISS" ? "…" : "Dismiss"}
      </Button>
      <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => setConfirming("REMOVE")}>
        Remove content
      </Button>
      <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run("WARN")}>
        Warn user
      </Button>
      <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => setConfirming("SUSPEND")}>
        Suspend
      </Button>
      <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => setConfirming("BAN")}>
        Ban
      </Button>

      {confirming ? (
        <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800">
            {confirming === "REMOVE" ? "Remove this content permanently from view?" : `${confirming} this user?`}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => run(confirming)}>
              {busy === confirming ? "Working…" : "Yes, do it"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}