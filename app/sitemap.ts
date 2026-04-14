import type { MetadataRoute } from "next"
import { getCachedRouteManifest } from "@/app/lib/route-manifest"

const baseUrl = "https://avana.cc"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getCachedRouteManifest()

  return routes.map(({ route, priority }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority,
  }))
}
