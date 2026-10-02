import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface-raised p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-700",
    brand: "bg-brand-100 text-brand-800",
    accent: "bg-accent-300 text-ink",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Status chip that never relies on colour alone — label is always present. */
export function StatusDot({ tone, label }: { tone: string; label: string }) {
  const color =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-red-500"
          : "bg-neutral-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "🎾",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-raised px-6 py-14 text-center">
      <span className="mb-3 text-4xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, action }: { message?: string; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center"
    >
      <span className="mb-2 text-3xl" aria-hidden="true">
        ⚠️
      </span>
      <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-red-700">
        {message ?? "We could not load this right now. Please try again."}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}