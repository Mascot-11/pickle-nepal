import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/lib/auth/actions";
import { AuthCard, AuthForm } from "@/components/ui/auth-form";
import { Field, Select } from "@/components/ui/form";
import { CITIES } from "@/lib/nepal";

export const metadata: Metadata = {
  title: "Join PickleNepal",
  description: "Create a free PickleNepal account to find pickleball games, courts and players in Nepal.",
  robots: { index: false, follow: false },
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  return <RegisterFormWrapper searchParams={searchParams} />;
}

async function RegisterFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <AuthCard
        title="Join PickleNepal"
        subtitle="Free forever. Find your people and your next game."
      >
        <AuthForm
          action={registerAction}
          submitLabel="Create account"
          footer={
            <div className="space-y-3 text-center text-sm">
              <p className="text-ink-soft">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-brand-700 hover:underline">
                  Log in
                </Link>
              </p>
              <p className="text-xs text-ink-soft">
                We only ask for a phone number so local players can reach you about games.
              </p>
            </div>
          }
        >
          <Field
            label="Full name"
            name="fullName"
            autoComplete="name"
            required
            placeholder="Aayush Karki"
          />
          <Field label="Username" name="username" hint="Optional. We will generate one if you skip." />
          <Field label="Email" name="email" type="email" autoComplete="email" required inputMode="email" />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            inputMode="tel"
            placeholder="98XXXXXXXX"
            hint="Nepali mobile number. +977 is added automatically."
          />
          <Select
            label="City"
            name="city"
            required
            defaultValue="KATHMANDU"
            options={CITIES.map((city) => ({ value: city.value, label: city.label }))}
            hint="We use this to show games, courts and players near you. No GPS required."
          />
          <Field
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            hint="Optional. Never shown publicly unless you choose to."
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            hint="At least 10 characters with upper case, lower case and a number."
          />
          {ref ? <input type="hidden" name="referralCode" value={ref} /> : null}
        </AuthForm>
      </AuthCard>
    </div>
  );
}