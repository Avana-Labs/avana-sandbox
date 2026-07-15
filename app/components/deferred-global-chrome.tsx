"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const DesktopHelpBubble = dynamic(
  () => import("./desktop-help-bubble").then((mod) => mod.DesktopHelpBubble),
  { ssr: false },
)

export function DeferredGlobalChrome() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = window.requestIdleCallback?.(() => setMounted(true)) ?? window.setTimeout(() => setMounted(true), 1)

    return () => {
      if (typeof id === "number") {
        window.clearTimeout(id)
        return
      }

      window.cancelIdleCallback?.(id)
    }
  }, [])

  if (!mounted) return null

  return <DesktopHelpBubble />
}
