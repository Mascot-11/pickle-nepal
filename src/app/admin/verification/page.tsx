import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/nav";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/misc";
import { timeAgo } from "@/lib/dates";
import { VerificationActions } from "@/components/admin/verification-actions";

export const metadata: Metadata = {
  title: "Admin · Verification",
  robots: { index: false, follow: false },
};

export default async function AdminVerificationPage() {
  requireAdmin().catch(() => redirect("/login?next=/admin/verification"));

  const requests = await prisma.verificationRequest.findMany({
    include: { applicant: { select: { fullName: true, username: true, avatarUrl: true, city: true } } },
    orderBy: { submittedAt: "desc" },
    take: 80,
  });

  const pending = requests.filter((r) => ["PENDING", "UNDER_REVIEW"].includes(r.status));
  const decided = requests.filter((r) => !["PENDING", "UNDER_REVIEW"].includes(r.status));

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Verification requests</h1>
      <p className="mt-1 text-ink-soft">Approving adds a verified badge to the club, coach, seller or organiser profile.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-bold text-ink">Pending ({pending.length})</h2>
            {pending.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Nothing pending" description="All verification requests have been decided." icon="✅" />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {pending.map((request) => (
                  <li key={request.id}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Avatar name={request.applicant.fullName} src={request.applicant.avatarUrl} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                            {request.name}
                            <Badge tone="brand">{request.type}</Badge>
                            <Badge tone="neutral">{request.status.replace(/_/g, " ")}</Badge>
                          </p>
                          <p className="text-xs text-ink-soft">
                            @{request.applicant.username} · {request.applicant.city.replace(/_/g, " ")} ·{" "}
                            {timeAgo(request.submittedAt)}
                          </p>
                        </div>
                      </div>

                      {request.organization ? (
                        <p className="mt-2 text-sm text-ink">Organisation: {request.organization}</p>
                      ) : null}
                      {request.description ? (
                        <p className="mt-1 text-sm text-ink-soft">{request.description}</p>
                      ) : null}
                      {request.contactInfo ? (
                        <p className="mt-1 text-xs text-ink-soft">Contact: {request.contactInfo}</p>
                      ) : null}
                      {request.documents.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {request.documents.map((doc) => (
                            <li key={doc}>
                              <a href={doc} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-700 hover:underline">
                                Document ↗
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-3 border-t border-line pt-3">
                        <VerificationActions requestId={request.id} />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink">History ({decided.length})</h2>
            <ul className="mt-4 space-y-2">
              {decided.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm"
                >
                  <span className="font-medium text-ink">{request.name}</span>
                  <span className="flex items-center gap-2 text-ink-soft">
                    <Badge tone="neutral">{request.type}</Badge>
                    {request.status.replace(/_/g, " ")} · {timeAgo(request.submittedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Container>
  );
}