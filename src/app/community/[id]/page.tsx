import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs, RelativeTime } from "@/components/ui/misc";
import { Avatar, ShareRow } from "@/components/ui/misc";
import { CommentBox } from "@/components/community/post-card";
import { deleteCommentAction } from "@/lib/social/actions";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.communityPost.findUnique({
    where: { id },
    select: { content: true, author: { select: { fullName: true } } },
  });
  if (!post) return { title: "Post not found", robots: { index: false, follow: false } };
  return {
    title: `${post.author.fullName} on PickleNepal`,
    description: post.content.slice(0, 160),
    alternates: { canonical: `/community/${id}` },
    openGraph: { type: "article", title: post.content.slice(0, 80), description: post.content.slice(0, 160) },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;
  const viewer = await getCurrentUser();

  const post = await prisma.communityPost.findFirst({
    where: { id, isHidden: false, deletedAt: null },
    include: {
      author: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      comments: {
        include: {
          author: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
          replies: {
            where: { deletedAt: null },
            include: { author: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
        where: { parentId: null, deletedAt: null },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!post) notFound();

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Community", href: "/community" }, { label: "Post" }]} />

      <article className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-line bg-surface-raised p-6">
          <div className="flex items-center gap-3">
            <Avatar name={post.author.fullName} src={post.author.avatarUrl} size={44} />
            <div>
              <a href={`/players/${post.author.username}`} className="font-semibold text-ink hover:text-brand-800">
                {post.author.fullName}
              </a>
              <p className="text-xs text-ink-soft">
                @{post.author.username} · <RelativeTime value={post.createdAt} />
              </p>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line text-ink">{post.content}</p>

          <div className="mt-5 flex items-center gap-4 border-t border-line pt-4 text-sm text-ink-soft">
            <span>♥ {post._count.likes}</span>
            <span>💬 {post._count.comments}</span>
          </div>

          <div className="mt-4">
            <ShareRow title="PickleNepal community post" path={`/community/${post.id}`} />
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink">Replies ({post.comments.length})</h2>

          {viewer ? (
            <div className="mt-4">
              <CommentBox postId={post.id} />
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-ink-soft">
              <a href={`/login?next=/community/${post.id}`} className="font-semibold text-brand-700 hover:underline">
                Log in
              </a>{" "}
              to join the conversation.
            </p>
          )}

          <ul className="mt-5 space-y-3">
            {post.comments.map((comment) => (
              <li key={comment.id} className="rounded-xl border border-line bg-surface-raised p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={comment.author.fullName} src={comment.author.avatarUrl} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <a href={`/players/${comment.author.username}`} className="font-semibold text-ink hover:text-brand-800">
                        {comment.author.fullName}
                      </a>{" "}
                      <span className="text-xs text-ink-soft">
                        · <RelativeTime value={comment.createdAt} />
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-ink">{comment.content}</p>

                    {comment.replies.length > 0 ? (
                      <ul className="mt-3 space-y-2 border-l-2 border-line pl-3">
                        {comment.replies.map((reply) => (
                          <li key={reply.id} className="text-sm">
                            <a href={`/players/${reply.author.username}`} className="font-semibold text-ink hover:text-brand-800">
                              {reply.author.fullName}
                            </a>{" "}
                            <span className="text-xs text-ink-soft">
                              · <RelativeTime value={reply.createdAt} />
                            </span>
                            <p className="text-ink">{reply.content}</p>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {viewer && (viewer.id === comment.author.id || viewer.role === "ADMIN" || viewer.role === "MODERATOR") ? (
                      <DeleteCommentButton commentId={comment.id} />
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </Container>
  );
}

function DeleteCommentButton({ commentId }: { commentId: string }) {
  return (
    <form
      action={async (formData: FormData) => {
        void formData;
        await deleteCommentAction(commentId);
        revalidatePath("/community");
      }}
      className="mt-2"
    >
      <button type="submit" className="text-xs text-ink-soft hover:text-red-600">
        Delete
      </button>
    </form>
  );
}

