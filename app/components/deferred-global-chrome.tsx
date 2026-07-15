"use client"

import dynamic from "next/dynamic"
import { CircleHelp } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const loadDesktopHelpBubble = () => import("./desktop-help-bubble").then((mod) => mod.DesktopHelpBubble)
const DesktopHelpBubble = dynamic(
  loadDesktopHelpBubble,
  { ssr: false },
)

export function DeferredGlobalChrome() {
  const [helpRequested, setHelpRequested] = useState(false)
  const { t } = useTranslation()

  if (helpRequested) return <DesktopHelpBubble initialOpen />

  return (
    <div
      className="fixed bottom-4 left-4 z-50 hidden md:block"
      style={{ width: "min(16rem, calc(100vw - 2rem))" }}
    >
      <button
        type="button"
        aria-label={t("Open help menu")}
        title={t("Help")}
        aria-expanded="false"
        onPointerEnter={() => void loadDesktopHelpBubble()}
        onFocus={() => void loadDesktopHelpBubble()}
        onClick={() => setHelpRequested(true)}
        className="inline-flex size-10 items-center justify-center rounded-none bg-transparent text-brand transition-transform duration-[160ms] hover:scale-[1.05] active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-emphasis/25 dark:text-white"
      >
        <CircleHelp className="h-6 w-6" strokeWidth={2.3} />
      </button>
    </div>
  )
}
