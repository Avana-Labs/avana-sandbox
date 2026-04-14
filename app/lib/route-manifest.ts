import { revalidateTag, unstable_cache } from "next/cache"

export type SiteRoute = {
  route: string
  priority: number
}

const ROUTE_MANIFEST_TAG = "site-route-manifest"

const STATIC_ROUTES: SiteRoute[] = [
  { route: "", priority: 1.0 },
  { route: "/explore", priority: 0.9 },
  { route: "/invest", priority: 0.85 },
  { route: "/perps", priority: 0.85 },
  { route: "/manage", priority: 0.8 },
  { route: "/incentivize", priority: 0.7 },
  { route: "/risk-warning", priority: 0.5 },
]

/** Caches server route metadata to avoid recalculating the route manifest on every request. */
export const getCachedRouteManifest = unstable_cache(
  async () => STATIC_ROUTES,
  ["site-route-manifest"],
  {
    revalidate: 3600,
    tags: [ROUTE_MANIFEST_TAG],
  },
)

/** Allows future content updates to invalidate the cached route manifest by tag. */
export async function refreshRouteManifest() {
  revalidateTag(ROUTE_MANIFEST_TAG)
}
