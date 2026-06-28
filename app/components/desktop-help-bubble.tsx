"use client"

import Link from "next/link"
import { CircleHelp } from "lucide-react"

export function DesktopHelpBubble() {
  return (
    <div className="fixed bottom-4 left-4 z-50 hidden md:block">
      <Link
        href="/support-center"
        aria-label="Open support center"
        title="Support"
        className="inline-flex size-10 items-center justify-center rounded-none bg-transparent text-[#01AACF] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-emphasis/25 dark:text-white"
      >
        <CircleHelp className="h-6 w-6" strokeWidth={2.3} />
      </Link>
    </div>
  )
}
