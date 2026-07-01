"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Header } from "@/app/components/header"
import { WrongNetworkBanner } from "@/app/components/wrong-network-banner"

export function ConditionalSiteHeader() {
  return <Header />
}

export function ConditionalSiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isActionRoute = pathname.startsWith("/actions/")

  return (
    <div className={isActionRoute ? "min-h-[100dvh] bg-background" : "flex min-h-screen flex-col"}>
      {isActionRoute ? null : <ConditionalSiteHeader />}
      <WrongNetworkBanner />
      <div className={isActionRoute ? "min-h-[100dvh]" : "flex-1"}>{children}</div>
    </div>
  )
}
