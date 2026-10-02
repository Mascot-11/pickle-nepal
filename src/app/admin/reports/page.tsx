import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/nav";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/dates";
import { ReportActions } from "@/components/admin/report-actions";

export const metadata: Metadata = {
  title: "Admin · Reports",
  robots: { index: false, follow: false },
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  requireStaff().catch(() => redirect("/login?next=/admin/reports"));
  const { status } = await searchParams;

  const reports = await prisma.report.findMany({
    where: status ? { status: status.toUpperCase() as never } : { status: { in: ["OPEN", "REVIEWING"] } },
    include: {
      reporter: { select: { username: true, fullName: true } },
      post: { select: { content: true } },
      comment: { select: { content: true } },
      review: { select: { comment: true, rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Reports & moderation</h1>
      <p className="mt-1 text-ink-soft">
        Reporter identity is not shown to other users. Every action here is written to the audit log.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />

        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {["", "OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].map((value) => (
              <a
                key={value || "open"}
                href={value ? `/admin/reports?status=${value}` : "/admin/reports"}
                className={(status ?? "") === value ? "chip chip-active" : "chip"}
              >
                {value ? value[0] + value.slice(1).toLowerCase() : "Needs review"}
              </a>
            ))}
          </div>

          {reports.length === 0 ? (
            <EmptyState title="Nothing to review" description="No reports in this state." icon="✅" />
          ) : (
            <ul className="space-y-3">
              {reports.map((report) => (
                <li key={report.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">{report.reason.replace(/_/g, " ")}</Badge>
                      <Badge tone="neutral">{report.targetType.replace(/_/g, " ")}</Badge>
                      <Badge tone={report.status === "OPEN" ? "danger" : "neutral"}>{report.status}</Badge>
                      <span className="ml-auto text-xs text-ink-soft">{timeAgo(report.createdAt)}</span>
                    </div>

                    {report.post ? (
                      <p className="mt-3 line-clamp-3 text-sm text-ink">{report.post.content}</p>
                    ) : report.comment ? (
                      <p className="mt-3 line-clamp-3 text-sm text-ink">{report.comment.content}</p>
                    ) : report.review ? (
                      <p className="mt-3 line-clamp-3 text-sm text-ink">
                        {report.review.rating}★ — {report.review.comment}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-ink-soft">
                        Target: {report.targetType} {report.targetUserId ?? report.courtId ?? report.listingId ?? ""}
                      </p>
                    )}

                    {report.details ? <p className="mt-2 text-sm text-ink-soft">“{report.details}”</p> : null}

                    <p className="mt-2 text-xs text-ink-soft">
                      Reported by @{report.reporter.username}
                      {report.action ? ` · ${report.action} by staff` : ""}
                    </p>

                    {["OPEN", "REVIEWING"].includes(report.status) ? (
                      <div className="mt-3 border-t border-line pt-3">
                        <ReportActions reportId={report.id} />
                      </div>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}