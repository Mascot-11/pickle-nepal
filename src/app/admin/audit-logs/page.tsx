import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/nav";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Admin · Audit logs",
  robots: { index: false, follow: false },
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  requireAdmin().catch(() => redirect("/login?next=/admin/audit-logs"));
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const perPage = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { admin: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auditLog.count(),
  ]);

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Audit logs</h1>
      <p className="mt-1 text-ink-soft">{total} recorded admin actions. Logs are append-only.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />

        <div>
          {logs.length === 0 ? (
            <EmptyState title="No audit entries" description="Admin actions will appear here." icon="📋" />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3">When</th>
                    <th className="py-3">Admin</th>
                    <th className="py-3">Action</th>
                    <th className="py-3">Target</th>
                    <th className="px-5 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 text-ink-soft">{timeAgo(log.createdAt)}</td>
                      <td className="py-3 font-medium text-ink">@{log.admin.username}</td>
                      <td className="py-3">
                        <Badge tone="neutral">{log.action.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-3 text-ink-soft">
                        {log.targetType} {log.targetId.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{log.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {total > perPage ? (
            <div className="mt-6 flex justify-center gap-2">
              {page > 1 ? (
                <a href={`/admin/audit-logs?page=${page - 1}`} className="chip">
                  Previous
                </a>
              ) : null}
              {page * perPage < total ? (
                <a href={`/admin/audit-logs?page=${page + 1}`} className="chip">
                  Next
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Container>
  );
}