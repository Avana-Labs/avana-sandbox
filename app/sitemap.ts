import type { MetadataRoute } from "next"
import { getCachedRouteManifest } from "@/app/lib/route-manifest"
import { SITE_URL } from "@/app/lib/site-url"

const baseUrl = SITE_URL

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getCachedRouteManifest()

  return routes.map(({ route, priority }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority,
  }))
}
