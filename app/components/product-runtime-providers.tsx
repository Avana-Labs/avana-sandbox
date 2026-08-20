"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { PreferencesProfileSync } from "@/app/components/preferences-profile-sync"
import { TokenPricesProvider } from "@/app/lib/prices/token-prices-context"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

const AvanaSessionProviders = dynamic(
  () => import("@/app/components/avana-session-providers").then((mod) => mod.AvanaSessionProviders),
  {
    ssr: false,
    loading: () => null,
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

  if (!isSignedIn && !needsProductRuntime(pathname)) {
    // Still provide the server-seeded prices so any price consumer rendered outside the
    // product runtime resolves live values instead of the fixture.
    return <TokenPricesProvider initialPrices={initialTokenPrices}>{children}</TokenPricesProvider>
  }

  return (
    <AvanaSessionProviders>
      <PreferencesProfileSync />
      <TokenPricesProvider initialPrices={initialTokenPrices}>{children}</TokenPricesProvider>
    </AvanaSessionProviders>
  )
}
