"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { toggleFollowAction, startConversationAction, blockUserAction, createReportAction } from "@/lib/social/actions";

export function PlayerProfileActions({
  viewerId,
  targetUserId,
  username,
  isFollowing,
  isSelf,
}: {
  viewerId: string | null;
  targetUserId: string;
  username: string;
  isFollowing: boolean;
  isSelf: boolean;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [following, setFollowing] = useState(isFollowing);
  const [busy, setBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

  if (isSelf) {
    return (
      <div className="flex gap-2">
        <ButtonLink href="/profile" variant="secondary" size="sm">
          Edit profile
        </ButtonLink>
      </div>
    );
  }

  if (!viewerId) {
    return (
      <div className="flex gap-2">
        <ButtonLink href={`/login?next=/players/${username}`} size="sm">
          Log in to follow
        </ButtonLink>
      </div>
    );
  }

  const run = async (key: string, fn: () => Promise<{ error?: string; success?: string }>) => {
    setBusy(key);
    try {
      const result = await fn();
      if (result.error) push(result.error, "error");
      else if (result.success) push(result.success);
      setMenu(false);
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      await (navigator as Navigator & { share?: (d: { title?: string; url?: string }) => Promise<void> }).share?.({
        title: document.title,
        url,
      });
    } catch {
      await navigator.clipboard.writeText(url);
      push("Profile link copied");
    }
  };

  return (
    <div className="relative flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={following ? "secondary" : "primary"}
        disabled={busy !== null}
        onClick={() =>
          run("follow", async () => {
            const result = await toggleFollowAction(targetUserId);
            if (!result.error) setFollowing((current) => !current);
            return result;
          })
        }
      >
        {busy === "follow" ? "…" : following ? "Following" : "Follow"}
      </Button>

      <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run("message", () => startConversationAction(targetUserId))}>
        Message
      </Button>

      <Button size="sm" variant="ghost" onClick={share} aria-label="Share this profile">
        Share
      </Button>

      <Button size="sm" variant="ghost" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
        ⋯
      </Button>

      {menu ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface-raised shadow-lg">
          <MenuItem
            label="Invite to a game"
            onClick={() => {
              setMenu(false);
              router.push(`/games/create?invite=${username}`);
            }}
          />
          <MenuItem
            label="Report this player"
            tone="danger"
            onClick={() =>
              run("report", async () => {
                const formData = new FormData();
                formData.set("reason", "OTHER");
                formData.set("details", "Reported from player profile");
                formData.set("targetType", "USER");
                formData.set("targetId", targetUserId);
                return createReportAction(formData);
              })
            }
          />
          <MenuItem
            label="Block player"
            tone="danger"
            onClick={() => run("block", () => blockUserAction(targetUserId))}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2 text-left text-sm hover:bg-brand-50 ${
        tone === "danger" ? "text-red-600" : "text-ink"
      }`}
    >
      {label}
    </button>
  );
}