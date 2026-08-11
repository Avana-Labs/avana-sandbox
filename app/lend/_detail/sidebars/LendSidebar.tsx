"use client"

import * as React from "react"
import type { LendMarketDetail } from "@/app/lib/lend-detail"
import { ResponsiveLendAction } from "@/app/components/action-page/responsive-lend-action"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

type Props = { detail: LendMarketDetail; className?: string }

type SidebarTab = "deposit" | "withdraw"

const LEND_TAB_ITEMS = [
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
] as const

export function LendSidebar({ detail, className }: Props) {
  const { t } = useTranslation()
  return (
    <aside
      className={cn("flex w-full flex-col gap-12", className)}
      aria-label={t("Lend {name}").replace("{name}", detail.hero.name)}
    >
      <LendActionRail detail={detail} className="mt-9" />
    </aside>
  )
}

export function LendMarketActions({ detail, className }: Props) {
  return <LendActionRail detail={detail} className={className} />
}

function LendActionRail({ detail, className }: Props) {
  const { t } = useTranslation()
  const marketId = detail.row.marketId
  const closeHref = `/lend/markets/${marketId}`
  const [tab, setTab] = React.useState<SidebarTab>("deposit")

  React.useEffect(() => {
    setTab("deposit")
  }, [detail.id])

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <div role="tablist" aria-label={t("Lend actions")} className="flex items-center gap-0">
        {LEND_TAB_ITEMS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-state={active ? "active" : "inactive"}
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[15px] font-semibold leading-none text-foreground/65 transition-colors hover:text-foreground",
                active && "bg-neutral-200 px-4.5 py-2.5 text-foreground dark:bg-neutral-800",
              )}
            >
              {t(item.label)}
            </button>
          )
        })}
      </div>

      <div className="mt-2">
        {tab === "deposit" ? (
          <ResponsiveLendAction kind="deposit" market={marketId} closeHref={closeHref} sidebar />
        ) : (
          <ResponsiveLendAction kind="withdraw" market={marketId} closeHref={closeHref} sidebar />
        )}
      </div>
    </div>
  )
}
