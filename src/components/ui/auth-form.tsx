"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";

type ActionFn = (
  prev: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

/**
 * Shared client form shell for auth screens: pending state, inline field errors
 * and a form-level alert (§65, §66).
 */
export function AuthForm({
  action,
  children,
  submitLabel,
  footer,
}: {
  action: ActionFn;
  children: React.ReactNode;
  submitLabel: string;
  footer?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
        >
          {state.success}
        </p>
      ) : null}

      {children}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </Button>

      {footer}
    </form>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-line bg-surface-raised p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-soft">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-4 text-center text-xs text-ink-soft">
        <Link href="/" className="hover:underline">
          ← Back to PickleNepal
        </Link>
      </p>
    </div>
  );
}

export { FieldError };