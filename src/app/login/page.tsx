import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/lib/auth/actions";
import { AuthCard, AuthForm } from "@/components/ui/auth-form";
import { Field } from "@/components/ui/form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to PickleNepal to find games, courts and players near you.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <AuthCard title="Welcome back" subtitle="Log in to see your games and messages.">
        <AuthForm
          action={loginAction}
          submitLabel="Log in"
          footer={
            <div className="space-y-3 text-center text-sm">
              <p className="text-ink-soft">
                New to PickleNepal?{" "}
                <Link href="/register" className="font-semibold text-brand-700 hover:underline">
                  Create an account
                </Link>
              </p>
              <p className="text-ink-soft">
                <Link href="/forgot-password" className="hover:underline">
                  Forgot your password?
                </Link>
              </p>
              <Link href="/" className="block text-ink-soft hover:underline">
                Browse as a guest
              </Link>
            </div>
          }
        >
          <Field label="Email" name="email" type="email" autoComplete="email" required inputMode="email" />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        </AuthForm>
      </AuthCard>
    </div>
  );
}