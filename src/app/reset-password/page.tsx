import type { Metadata } from "next";
import { resetPasswordAction } from "@/lib/auth/actions";
import { AuthCard, AuthForm } from "@/components/ui/auth-form";
import { Field } from "@/components/ui/form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; success?: string }>;
}) {
  const { token, success } = await searchParams;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <AuthCard title="Choose a new password">
        {success ? (
          <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
            Your password has been updated. You can now log in.
          </p>
        ) : !token ? (
          <div className="space-y-3 text-sm text-ink-soft">
            <p>This reset link is missing its token.</p>
            <a href="/forgot-password" className="font-semibold text-brand-700 hover:underline">
              Request a new link
            </a>
          </div>
        ) : (
          <AuthForm action={resetPasswordAction} submitLabel="Update password">
            <input type="hidden" name="token" value={token} />
            <Field
              label="New password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              hint="At least 10 characters with upper case, lower case and a number."
            />
            <p className="text-xs text-ink-soft">
              Changing your password signs you out of every device.
            </p>
          </AuthForm>
        )}
      </AuthCard>
    </div>
  );
}