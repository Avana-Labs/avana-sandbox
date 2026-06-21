"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import type { BorrowWorkspaceData } from "@/app/lib/data/providers/borrow"

const BorrowWorkspace = dynamic(() => import("./components/borrow-workspace").then((mod) => mod.BorrowWorkspace), {
  ssr: false,
  loading: () => <BorrowWorkspacePlaceholder />,
})

function BorrowWorkspacePlaceholder() {
  return (
    <div
      className="h-[320px] rounded-radius-md border border-border bg-surface-raised/60"
      aria-hidden
    />
  )
}

export function BorrowWorkspaceShell({ pageData }: { pageData: BorrowWorkspaceData }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (shouldMount) return

    let cancelled = false
    const mount = () => {
      if (!cancelled) setShouldMount(true)
    }

    const onIntent = () => mount()
    window.addEventListener("scroll", onIntent, { passive: true, once: true })
    window.addEventListener("pointerdown", onIntent, { once: true })
    window.addEventListener("keydown", onIntent, { once: true })

    const shell = shellRef.current
    const observer =
      shell &&
      new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            window.setTimeout(mount, 8_000)
          }
        },
        { rootMargin: "0px 0px -200px 0px", threshold: 0.1 },
      )

    if (observer && shell) observer.observe(shell)

    const fallbackId = window.setTimeout(mount, 12_000)

    return () => {
      cancelled = true
      window.removeEventListener("scroll", onIntent)
      window.removeEventListener("pointerdown", onIntent)
      window.removeEventListener("keydown", onIntent)
      observer?.disconnect()
      window.clearTimeout(fallbackId)
    }
  }, [shouldMount])

  return (
    <div
      ref={shellRef}
      className="borrow-workspace-shell min-h-[320px] [content-visibility:auto] [contain-intrinsic-size:320px]"
    >
      {shouldMount ? <BorrowWorkspace pageData={pageData} /> : <BorrowWorkspacePlaceholder />}
    </div>
  )
}
