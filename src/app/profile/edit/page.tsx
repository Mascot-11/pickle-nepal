import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/misc";
import { ProfileEditForm } from "@/components/profile/edit-form";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false },
};

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/edit");

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, bio: true, avatarUrl: true },
  });
  const profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
  if (!profile || !account) redirect("/onboarding");

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Edit" }]} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Edit your profile</h1>
      <p className="mt-1 text-ink-soft">
        This is what other players see. Your email and phone are never shown.
      </p>

      <div className="mt-6 max-w-3xl">
        <ProfileEditForm
          defaults={{
            fullName: user.fullName,
            username: user.username,
            phone: account.phone,
            city: user.city,
            bio: account.bio,
            avatarUrl: account.avatarUrl,
            skillLevel: profile.skillLevel,
            duprRating: profile.duprRating,
            formats: profile.preferredFormats,
            position: profile.position,
            availability: profile.availability,
            frequency: profile.frequency,
            instagram: profile.instagram,
            visibility: profile.visibility,
          }}
        />
      </div>
    </Container>
  );
}