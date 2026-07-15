import { revalidateTag, unstable_cache } from "next/cache"
import { SITE_STATIC_ROUTES, type SiteRoute } from "@/app/lib/site-static-routes"

export type { SiteRoute }

const ROUTE_MANIFEST_TAG = "site-route-manifest"

/** Synchronous route manifest for tests and build-time consumers. */
export { SITE_STATIC_ROUTES }

/** Caches server route metadata to avoid recalculating the route manifest on every request. */
export const getCachedRouteManifest = unstable_cache(async () => SITE_STATIC_ROUTES, ["site-route-manifest"], {
  revalidate: 3600,
  tags: [ROUTE_MANIFEST_TAG],
})

/** Allows future content updates to invalidate the cached route manifest by tag. */
export async function refreshRouteManifest() {
  revalidateTag(ROUTE_MANIFEST_TAG, "max")
}
