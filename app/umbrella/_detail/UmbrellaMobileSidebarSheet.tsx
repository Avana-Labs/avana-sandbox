"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"
import { UmbrellaSidebar } from "./sidebars/UmbrellaSidebar"

export type UmbrellaMobileSheetTrigger = "stake" | "cooldown" | "unstake" | "claim"

/**
 * Mobile-only bottom sheet that surfaces the umbrella action sidebar. Reuses
 * the shared shadcn Dialog primitive (Radix under the hood → focus trap + ESC
 * + backdrop click for free) with `fullScreenOnMobile` so it fills the viewport
 * on small screens and falls back to a centered dialog on tablet+.
 *
 * The mobile action bar in /umbrella lifts this to swap between Stake and
 * More; on desktop the sheet never renders because the aside sidebar takes
 * over (lg:block on the parent aside).
 */
export function UmbrellaMobileSidebarSheet({
  open,
  onOpenChange,
  moduleId,
  onMarketChange,
  initialTab: _initialTab,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  moduleId: UmbrellaMarketId
  onMarketChange?: (marketId: UmbrellaMarketId) => void
  // The trigger the user tapped. UmbrellaSidebar owns its own tab state and
  // resets to "stake" on remount, so `initialTab` is currently accepted but
  // handled by the sidebar's default. If we later need Stake→More to jump to
  // a specific tab, thread this into UmbrellaSidebar as a new prop.
  initialTab?: UmbrellaMobileSheetTrigger
}) {
  // Force a remount of UmbrellaSidebar when the sheet is (re)opened so the
  // Stake/Cooldown/Unstake tab lands on the trigger's default. Closing a sheet
  // shouldn't wipe unsaved input if the user just backgrounded it — but from
  // a mobile-nav POV, tapping a different bar button means "start there".
  const sessionRef = useRef(0)
  const [sessionKey, setSessionKey] = useState(0)
  useEffect(() => {
    if (!open) return
    sessionRef.current += 1
    setSessionKey(sessionRef.current)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullScreenOnMobile
        aria-label="Umbrella actions"
        className="max-md:flex max-md:flex-col max-md:overflow-hidden md:max-w-[420px] md:rounded-radius-lg md:p-4"
      >
        <DialogTitle className="sr-only">Umbrella actions</DialogTitle>
        <DialogDescription className="sr-only">
          Stake, claim rewards, start cooldown, or unstake from the umbrella safety module.
        </DialogDescription>
        <div className="flex items-center justify-between border-b border-border px-4 py-3 max-md:pt-6 md:hidden">
          <div>
            <div className="text-[14px] font-semibold text-foreground">Umbrella</div>
            <div className="text-[11px] text-muted-foreground">Stake, claim, cooldown, unstake</div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close umbrella actions"
            className="h-8 rounded-radius-sm border border-border bg-surface-raised px-3 text-[12px] font-medium text-foreground hover:bg-surface-hover"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 md:px-0 md:pt-0">
          <UmbrellaSidebar key={sessionKey} moduleId={moduleId} onMarketChange={onMarketChange} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
