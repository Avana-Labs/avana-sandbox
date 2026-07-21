"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/app/components/header"

export function ActionsLayoutChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const useActionFlowHeader = pathname.startsWith("/actions/borrow/") || pathname.startsWith("/actions/lend/")

  return (
    <div className="min-h-[100dvh] bg-background">
      {useActionFlowHeader ? null : <Header />}
      {children}
    </div>
  )
}
