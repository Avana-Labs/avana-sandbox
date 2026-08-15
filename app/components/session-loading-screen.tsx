"use client"

import { usePathname } from "next/navigation"
import {
  AppShellSkeleton,
  DashboardPageSkeleton,
  DetailPageSkeleton,
  HomeWorkspaceSkeleton,
  ProductLandingSkeleton,
  UmbrellaPageSkeleton,
} from "@/app/components/loading-states"

/**
 * Route-aware session loading screen.
 *
 * Replaces the ad-hoc "grey pill on a blank screen" fallbacks the auth gates
 * used to show while Convex authenticates the session or sandbox state hydrates.
 * Each real product surface has a matching shimmer skeleton that mirrors the
 * page shape 1:1 (widths, section order, card counts) so the content reveals in
 * place with zero layout shift when the gate resolves.
 *
 * The top navigation progress bar (`app/components/page-loading-bar.tsx`) is
 * still the primary "something is happening" signal on route changes; this
 * skeleton is what fills the page body underneath while a signed-in session
 * warms up its Convex queries.
 */
export function SessionLoadingScreen() {
  const pathname = usePathname()

  if (pathname === "/" || pathname === "") {
    return <HomeWorkspaceSkeleton />
  }
  if (pathname.startsWith("/umbrella")) {
    return <UmbrellaPageSkeleton />
  }
  if (pathname.startsWith("/dashboard")) {
    return <DashboardPageSkeleton />
  }
  // Four canonical detail routes: /borrow/markets/[marketId],
  // /borrow/assets/[assetId], /lend/markets/[marketId],
  // /multiply/markets/[marketId]. (/borrow/pool and /borrow/asset are legacy
  // singular aliases handled by resolveActionCloseHref; they redirect to the
  // plural forms so a skeleton for them isn't needed.)
  if (
    pathname.startsWith("/borrow/markets/") ||
    pathname.startsWith("/borrow/assets/") ||
    pathname.startsWith("/lend/markets/") ||
    pathname.startsWith("/multiply/markets/")
  ) {
    return <DetailPageSkeleton />
  }
  if (
    pathname.startsWith("/borrow") ||
    pathname.startsWith("/lend") ||
    pathname.startsWith("/multiply") ||
    pathname.startsWith("/swap")
  ) {
    return <ProductLandingSkeleton />
  }
  return <AppShellSkeleton />
}
