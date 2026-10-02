import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { AuthCard, AuthForm } from "@/components/ui/auth-form";
import { Field } from "@/components/ui/form";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <AuthCard
        title="Reset your password"
        subtitle="Enter your email and we will send you a reset link."
      >
        <AuthForm
          action={requestPasswordResetAction}
          submitLabel="Send reset link"
          footer={
            <p className="text-center text-sm">
              <Link href="/login" className="text-brand-700 hover:underline">
                Back to log in
              </Link>
            </p>
          }
        >
          <Field label="Email" name="email" type="email" autoComplete="email" required inputMode="email" />
          <p className="text-xs text-ink-soft">
            The link expires in one hour. Resetting your password signs you out everywhere.
          </p>
        </AuthForm>
      </AuthCard>
    </div>
  );
}