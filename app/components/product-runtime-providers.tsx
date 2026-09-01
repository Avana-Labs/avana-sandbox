"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { PreferencesProfileSync } from "@/app/components/preferences-profile-sync"
import { RouteContentSkeleton } from "@/app/components/loading-states"
import { TokenPricesProvider } from "@/app/lib/prices/token-prices-context"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

const AvanaSessionProviders = dynamic(
  () => import("@/app/components/avana-session-providers").then((mod) => mod.AvanaSessionProviders),
  {
    ssr: false,
    // Instant Paint: never blank the product tree while the session chunk downloads.
    // The persistent site header lives above this gate, so we paint only the
    // route-matched content skeleton here.
    loading: () => <RouteContentSkeleton />,
  },
)

const PRODUCT_RUNTIME_ROUTES = [
  "/actions",
  "/borrow",
  "/lend",
  "/multiply",
  "/swap",
  "/dashboard",
  "/sandbox",
  "/onboarding",
  "/umbrella",
  "/ask",
]

function needsProductRuntime(pathname: string) {
  return PRODUCT_RUNTIME_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export function ProductRuntimeProviders({
  children,
  initialTokenPrices,
}: {
  children: ReactNode
  initialTokenPrices?: Record<string, number>
}) {
  const pathname = usePathname()
  const { isSignedIn } = useSiweAuth()

  // Guest `/ask` owns a dedicated Convex auth boundary (SIWE or limited guest JWT).
  // Signed-in users keep the normal product runtime mounted under Ask so closing it
  // does not remount AvanaSessionProviders and flash a blank screen.
  if ((pathname === "/ask" || pathname.startsWith("/ask/")) && !isSignedIn) {
    return (
      <TokenPricesProvider initialPrices={initialTokenPrices} realtime={false}>
        {children}
      </TokenPricesProvider>
    )
  }

  if (!isSignedIn && !needsProductRuntime(pathname)) {
    // Still provide the server-seeded prices so any price consumer rendered outside the product
    // runtime resolves live values instead of the fixture. No Convex session is mounted on this
    // branch (guest, non-product route like `/`), so realtime={false} avoids lazy-loading
    // convex/react for a subscription that would only throw for lack of a provider and fall back
    // to this same seed. Mirrors the guest `/ask` branch above.
    return (
      <TokenPricesProvider initialPrices={initialTokenPrices} realtime={false}>
        {children}
      </TokenPricesProvider>
    )
  }

  return (
    <AvanaSessionProviders>
      <PreferencesProfileSync />
      <TokenPricesProvider initialPrices={initialTokenPrices}>{children}</TokenPricesProvider>
    </AvanaSessionProviders>
  )
}
