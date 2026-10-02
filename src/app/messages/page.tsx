import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/db";
import { Container, SectionHeading } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/primitives";
import { Avatar, RelativeTime } from "@/components/ui/misc";
import { timeAgo } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  if (!(await isFeatureEnabled("MESSAGING"))) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Messaging is not available"
          description="Messaging has not been enabled on this deployment."
          icon="✉️"
        />
      </Container>
    );
  }

  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
  });

  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="Messages"
        title="Your conversations"
        description="Private 1:1 messages with players, clubs, coaches, organisers and sellers."
      />

      {memberships.length === 0 ? (
        <EmptyState
          title="Your conversations will appear here"
          description="Message a player from their profile, or a seller from a marketplace listing."
          icon="✉️"
          action={
            <Link href="/players" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              Find players
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {memberships.map((membership) => {
            const conversation = membership.conversation;
            const others = conversation.participants.filter((p) => p.userId !== user.id);
            const last = conversation.messages[0];
            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-4 hover:border-brand-300"
                >
                  {others.slice(0, 1).map((other) => (
                    <Avatar key={other.userId} name={other.user.fullName} src={other.user.avatarUrl} size={44} />
                  ))}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">
                      {others.map((o) => o.user.fullName).join(", ") || "Conversation"}
                    </p>
                    <p className="truncate text-sm text-ink-soft">
                      {last ? `${last.sender.fullName.split(" ")[0]}: ${last.content}` : "No messages yet"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <RelativeTime value={conversation.lastMessageAt} />
                    {membership.unreadCount > 0 ? (
                      <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 text-[10px] font-bold text-white">
                        {membership.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-xs text-ink-soft">
        Last activity {timeAgo(new Date())}. Blocking a player removes messaging between you
        immediately.
      </p>
    </Container>
  );
}