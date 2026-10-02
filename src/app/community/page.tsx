import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeed, FEED_PAGE_SIZE } from "@/lib/feed";
import { Container, SectionHeading } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { FeedTabs } from "@/components/community/feed-tabs";

export const metadata: Metadata = {
  title: "Pickleball community in Nepal",
  description:
    "Talk to pickleball players across Nepal: find partners, share court tips, announce tournaments and gear deals.",
  alternates: { canonical: "/community" },
};

type SearchParams = Promise<{ mode?: string }>;

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await getCurrentUser();
  const { mode } = await searchParams;

  const feedMode = mode === "following" || mode === "popular" ? mode : "newest";

  const { posts } = await getFeed({
    mode: feedMode,
    viewerId: viewer?.id ?? null,
    limit: FEED_PAGE_SIZE,
  });

  return (
    <Container className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Community"
        title="The PickleNepal feed"
        description="Ask for partners, share court news, announce tournaments and help each other get better."
      />

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8">
        <div>
          {viewer ? <PostComposer viewer={viewer} /> : null}
          <div className="mt-6">
            <FeedTabs current={feedMode} />
          </div>

          {posts.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={feedMode === "following" ? "Your following feed is empty" : "No posts yet"}
                description={
                  feedMode === "following"
                    ? "Follow a few players and their posts will show up here."
                    : "Be the first to post something to the community."
                }
                action={
                  viewer ? (
                    <ButtonLink href="/players">Find players</ButtonLink>
                  ) : (
                    <ButtonLink href="/register">Join PickleNepal</ButtonLink>
                  )
                }
                icon="💬"
              />
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} viewer={viewer} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="mt-8 space-y-4 lg:mt-0">
          <div className="rounded-2xl border border-line bg-surface-raised p-5">
            <h2 className="font-semibold text-ink">Community guidelines</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              <li>· Be welcoming to new players.</li>
              <li>· Share real, checkable court details.</li>
              <li>· No spam or harassment.</li>
              <li>· Report anything that looks wrong.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-surface-raised p-5">
            <h2 className="font-semibold text-ink">Post types</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              <li>Looking for Players</li>
              <li>Tournament</li>
              <li>Court</li>
              <li>Gear</li>
              <li>Coaching</li>
              <li>Announcement</li>
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}