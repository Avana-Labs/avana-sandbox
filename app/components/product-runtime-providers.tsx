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
    loading: () => <div className="min-h-screen bg-background" />,
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
]

function needsProductRuntime(pathname: string) {
  return PRODUCT_RUNTIME_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export function ProductRuntimeProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isSignedIn } = useSiweAuth()

  if (!isSignedIn && !needsProductRuntime(pathname)) {
    return <>{children}</>
  }

  return (
    <AvanaSessionProviders>
      <PreferencesProfileSync />
      <TokenPricesProvider>{children}</TokenPricesProvider>
    </AvanaSessionProviders>
  )
}
