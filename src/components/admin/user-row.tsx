"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button } from "@/components/ui/button";
import { setUserRoleAction, setUserStatusAction } from "@/lib/settings/actions";

const ROLES = ["PLAYER", "CLUB_ADMIN", "COACH", "ORGANIZER", "SELLER", "MODERATOR", "ADMIN"];

export function UserAdminRow({ userId, status }: { userId: string; status: string }) {
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("PLAYER");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<{ error?: string; success?: string }>) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result.error) push(result.error, "error");
      else if (result.success) push(result.success);
      setConfirming(null);
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <select
        value={role}
        onChange={(event) => setRole(event.target.value)}
        className="rounded-lg border border-line px-2 py-1.5 text-xs"
        aria-label="Change role"
      >
        {ROLES.map((value) => (
          <option key={value} value={value}>
            {value.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => run("role", () => setUserRoleAction(userId, role))}
      >
        Set role
      </Button>

      {status === "ACTIVE" ? (
        <>
          <Button size="sm" variant="ghost" onClick={() => setConfirming("SUSPEND")}>
            Suspend
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirming("BAN")}>
            Ban
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run("restore", () => setUserStatusAction(userId, "RESTORE"))}
        >
          Restore account
        </Button>
      )}

      {confirming ? (
        <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800">
            {confirming === "BAN" ? "Ban this account permanently?" : "Suspend this account?"}
          </p>
          <p className="mt-1 text-xs text-red-700">
            Their sessions end immediately and they cannot sign in. This is recorded in the audit log.
          </p>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason"
            maxLength={200}
            className="mt-2 w-full rounded-lg border border-red-200 px-3 py-1.5 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() =>
                run("status", () =>
                  setUserStatusAction(userId, confirming as "SUSPEND" | "BAN", reason || undefined),
                )
              }
            >
              {busy ? "Working…" : `Yes, ${confirming.toLowerCase()}`}
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