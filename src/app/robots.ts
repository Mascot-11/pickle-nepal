import type { MetadataRoute } from "next";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/games", "/courts", "/players", "/events", "/tournaments", "/clubs", "/coaches", "/community", "/rankings", "/about"],
        disallow: [
          "/admin",
          "/dashboard",
          "/profile",
          "/settings",
          "/messages",
          "/notifications",
          "/onboarding",
          "/organizer",
          "/club/",
          "/api/",
          "/search",
          "/login",
          "/register",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}