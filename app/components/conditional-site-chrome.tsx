"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Header } from "@/app/components/header"
import { WrongNetworkBanner } from "@/app/components/wrong-network-banner"

export function ConditionalSiteHeader() {
  return <Header />
}

export function ConditionalSiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isActionRoute = pathname.startsWith("/actions/") || pathname === "/swap"
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const update = () => setIsDesktop(media.matches)

    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const showHeader = !isActionRoute || (pathname === "/swap" && isDesktop)

  return (
    <div className={isActionRoute ? "min-h-[100dvh] bg-background" : "flex min-h-screen flex-col"}>
      {showHeader ? <ConditionalSiteHeader /> : null}
      <WrongNetworkBanner />
      <div className={isActionRoute ? "min-h-[100dvh]" : "flex-1"}>{children}</div>
    </div>
  )
}
