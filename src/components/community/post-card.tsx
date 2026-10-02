"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/providers/toast";
import { Avatar, RelativeTime } from "@/components/ui/misc";
import { Badge, Card } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import {
  createCommentAction,
  deletePostAction,
  togglePostLikeAction,
  toggleSaveAction,
} from "@/lib/social/actions";
import type { SessionUser } from "@/lib/auth/session";

export type FeedPost = {
  id: string;
  content: string;
  type: string;
  images: string[];
  linkUrl: string | null;
  createdAt: Date;
  isPinned: boolean;
  author: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    city: string;
  };
  _count: { likes: number; comments: number };
  /** Only populated when a viewer is signed in. */
  likes?: Array<{ id: string }> | false;
  saves?: Array<{ id: string }> | false;
};

/** Viewer-scoped relation arrays are `false` (not loaded) when signed out. */
function countOf(rows: Array<{ id: string }> | false | undefined | null): number {
  return Array.isArray(rows) ? rows.length : 0;
}

export function PostCard({ post, viewer }: { post: FeedPost; viewer: SessionUser | null }) {
  const { push } = useToast();
  const router = useRouter();
  const [liked, setLiked] = useState(countOf(post.likes) > 0);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [saved, setSaved] = useState(countOf(post.saves) > 0);
  const [commenting, setCommenting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const call = async (key: string, fn: () => Promise<{ error?: string }>, onOk?: () => void) => {
    setBusy(key);
    try {
      const result = await fn();
      if (result.error) push(result.error, "error");
      else onOk?.();
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : "Something went wrong", "error");
    } finally {
      setBusy(null);
    }
  };

  if (deleted) return null;

  const isAuthor = viewer?.id === post.author.id;
  const isStaff = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <Avatar name={post.author.fullName} src={post.author.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/players/${post.author.username}`} className="font-semibold text-ink hover:text-brand-800">
              {post.author.fullName}
            </Link>
            <Badge tone="neutral">{post.type.replace(/_/g, " ").toLowerCase()}</Badge>
            {post.isPinned ? <Badge tone="accent">Pinned</Badge> : null}
          </div>
          <p className="text-xs text-ink-soft">
            @{post.author.username} · <RelativeTime value={post.createdAt} />
          </p>
        </div>

        {isAuthor || isStaff ? (
          <button
            type="button"
            aria-label="Delete post"
            onClick={() =>
              call("delete", async () => {
                const result = await deletePostAction(post.id);
                if (!result.error) setDeleted(true);
                return result;
              })
            }
            className="text-sm text-ink-soft hover:text-red-600"
          >
            🗑
          </button>
        ) : null}
      </div>

      <Link href={`/community/${post.id}`} className="mt-3 block whitespace-pre-line text-ink">
        {post.content}
      </Link>

      {post.images.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {post.images.map((image) => (
            <SmartImage key={image} src={image} alt="Post attachment" className="aspect-[16/9] w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {post.linkUrl ? (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
        >
          {post.linkUrl}
        </a>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <Button
          size="sm"
          variant="ghost"
          disabled={!viewer || busy !== null}
          onClick={() =>
            call(
              "like",
              async () => {
                const result = await togglePostLikeAction(post.id);
                if (!result.error) {
                  setLiked((current) => !current);
                  setLikeCount((count) => (liked ? count - 1 : count + 1));
                }
                return result;
              },
            )
          }
          aria-pressed={liked}
        >
          {liked ? "♥" : "♡"} {likeCount}
        </Button>

        <Button size="sm" variant="ghost" onClick={() => setCommenting((v) => !v)}>
          💬 {post._count.comments}
        </Button>

        {viewer ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={() =>
              call("save", async () => {
                const result = await toggleSaveAction(post.id, "POST");
                if (!result.error) setSaved((current) => !current);
                return result;
              })
            }
            aria-pressed={saved}
          >
            {saved ? "🔖 Saved" : "🔖 Save"}
          </Button>
        ) : null}
      </div>

      {commenting ? (
        <CommentBox postId={post.id} onDone={() => setCommenting(false)} />
      ) : null}
    </Card>
  );
}

export function CommentBox({ postId, onDone }: { postId: string; onDone?: () => void }) {
  const { push } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async (formData) => {
        setBusy(true);
        try {
          const result = await createCommentAction(postId, formData);
          if (result.error) push(result.error, "error");
          else {
            if (result.success) push(result.success);
            router.refresh();
            onDone?.();
          }
        } catch (error) {
          push(error instanceof Error ? error.message : "Could not post comment", "error");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-3 flex gap-2"
    >
      <label htmlFor={`comment-${postId}`} className="sr-only">
        Write a reply
      </label>
      <input
        id={`comment-${postId}`}
        name="content"
        required
        maxLength={2000}
        placeholder="Write a reply…"
        className="flex-1 rounded-xl border border-line px-3 py-2 text-sm"
      />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "…" : "Reply"}
      </Button>
    </form>
  );
}

export function FeedTabs({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { key: "newest", label: "Newest" },
    { key: "following", label: "Following" },
    { key: "popular", label: "Popular" },
  ];

  return (
    <div className="flex gap-1 rounded-full border border-line bg-surface-raised p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={current === tab.key}
          onClick={() => router.push(`${pathname}?mode=${tab.key}`)}
          className={`flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            current === tab.key ? "bg-brand-700 text-white" : "text-ink-soft hover:bg-brand-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}