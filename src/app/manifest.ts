import type { MetadataRoute } from "next";

/** PWA manifest (§79). Icons are served from /public. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PickleNepal — Find your people. Find your game.",
    short_name: "PickleNepal",
    description:
      "Nepal's pickleball community: find courts, join open games, follow tournaments and grow the game.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1b5e3f",
    categories: ["sports", "social", "lifestyle"],
    lang: "en-NP",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-maskable.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Find a Game", url: "/games" },
      { name: "Courts", url: "/courts" },
      { name: "Community", url: "/community" },
    ],
  };
}