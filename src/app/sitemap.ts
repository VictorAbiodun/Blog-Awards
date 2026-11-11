import type { MetadataRoute } from "next";

import { api } from "@/services";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Static public pages
  const staticRoutes = ["", "/nominees", "/leaderboard", "/contact", "/terms", "/privacy", "/refunds"];

  const routes: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/nominees" || route === "/leaderboard" ? "hourly" : "weekly",
    priority: route === "" ? 1.0 : route === "/nominees" ? 0.9 : 0.7,
  }));

  try {
    const artists = await api.listArtists();
    for (const artist of artists) {
      routes.push({
        url: `${baseUrl}/nominees/${artist.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch {
    // If database unavailable at build time, return static routes gracefully
  }

  return routes;
}
