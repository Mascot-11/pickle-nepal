import { describe, expect, it } from "vitest";
import { canViewProfile } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

const viewer = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: "viewer-1",
  email: "v@test",
  fullName: "Viewer",
  username: "viewer",
  role: "PLAYER",
  city: "KATHMANDU",
  avatarUrl: null,
  isOnboarded: true,
  status: "ACTIVE",
  ...overrides,
});

describe("profile privacy (§11.3)", () => {
  const target = (visibility: string, userId = "other") => ({ id: "profile-1", userId, visibility });

  it("always lets a player see their own profile", () => {
    expect(canViewProfile(viewer({ id: "me" }), target("PRIVATE", "me"))).toBe(true);
  });

  it("shows public profiles to anyone", () => {
    expect(canViewProfile(null, target("PUBLIC"))).toBe(true);
    expect(canViewProfile(viewer(), target("PUBLIC"))).toBe(true);
  });

  it("hides community-only profiles from guests", () => {
    expect(canViewProfile(null, target("COMMUNITY_ONLY"))).toBe(false);
    expect(canViewProfile(viewer(), target("COMMUNITY_ONLY"))).toBe(true);
  });

  it("hides private profiles from other members", () => {
    expect(canViewProfile(viewer(), target("PRIVATE"))).toBe(false);
  });

  it("lets staff see any profile for moderation", () => {
    expect(canViewProfile(viewer({ role: "ADMIN" }), target("PRIVATE"))).toBe(true);
    expect(canViewProfile(viewer({ role: "MODERATOR" }), target("PRIVATE"))).toBe(true);
  });
});
