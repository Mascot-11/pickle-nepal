import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { requireConversationParticipant } from "@/lib/auth/permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/db";
import { markConversationReadAction } from "@/lib/social/actions";
import { Container } from "@/components/ui/container";
import { Avatar, Breadcrumbs } from "@/components/ui/misc";
import { MessageComposer } from "@/components/messaging/message-composer";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversation: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/messages`);
  if (!(await isFeatureEnabled("MESSAGING"))) notFound();

  const { conversation: conversationId } = await params;

  // Authorisation: only participants may read a conversation (§41).
  await requireConversationParticipant(conversationId);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
      },
      messages: {
        include: { sender: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
    },
  });

  if (!conversation) notFound();

  await markConversationReadAction(conversationId);

  const others = conversation.participants.filter((p) => p.userId !== user.id);

  return (
    <Container className="py-6">
      <Breadcrumbs items={[{ label: "Messages", href: "/messages" }, { label: others.map((o) => o.user.fullName).join(", ") }]} />

      <div className="mx-auto max-w-3xl">
        <div className="rounded-t-2xl border border-line bg-surface-raised px-5 py-3">
          <h1 className="font-semibold text-ink">
            {others.map((o) => o.user.fullName).join(", ") || "Conversation"}
          </h1>
          <p className="text-xs text-ink-soft">{conversation.messages.length} messages</p>
        </div>

        <ul className="max-h-[55vh] space-y-3 overflow-y-auto border-x border-line bg-surface p-5">
          {conversation.messages.length === 0 ? (
            <li className="py-10 text-center text-sm text-ink-soft">Say hello to start the conversation.</li>
          ) : (
            conversation.messages.map((message) => {
              const mine = message.senderId === user.id;
              return (
                <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      mine ? "bg-brand-700 text-white" : "bg-surface-raised text-ink"
                    }`}
                  >
                    {!mine ? (
                      <p className="mb-0.5 flex items-center gap-2 text-xs font-semibold opacity-80">
                        <Avatar name={message.sender.fullName} size={18} />
                        {message.sender.fullName.split(" ")[0]}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="rounded-b-2xl border border-line bg-surface-raised p-3">
          <MessageComposer conversationId={conversationId} />
        </div>
      </div>
    </Container>
  );
}