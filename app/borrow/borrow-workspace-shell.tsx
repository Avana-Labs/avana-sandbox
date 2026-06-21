"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import type { BorrowWorkspaceData } from "@/app/lib/data/providers/borrow"

const BorrowWorkspace = dynamic(() => import("./components/borrow-workspace").then((mod) => mod.BorrowWorkspace), {
  ssr: false,
  loading: () => <div className="h-[960px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

export function BorrowWorkspaceShell({ pageData }: { pageData: BorrowWorkspaceData }) {
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    const mount = () => setShouldMount(true)
    const idleId = window.requestIdleCallback?.(mount, { timeout: 1_500 })
    const timeoutId = idleId === undefined ? window.setTimeout(mount, 1_500) : undefined

    return () => {
      if (idleId !== undefined) {
        window.cancelIdleCallback?.(idleId)
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  return (
    <div className="borrow-workspace-shell min-h-[960px] [content-visibility:auto] [contain-intrinsic-size:960px]">
      {shouldMount ? (
        <BorrowWorkspace pageData={pageData} />
      ) : (
        <div className="h-[960px] rounded-radius-md border border-border bg-surface-raised/60" aria-hidden />
      )}
    </div>
  )
}
