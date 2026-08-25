"use client"

import Link from "next/link"
import {
  ArrowShrink,
  ArrowUpRightStack,
  CircleArrowOutDownRight,
  CircleArrowOutUpLeft,
  EnteringGeoFence,
  LeavingGeoFence,
} from "@/app/components/icons"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const RETURN_HREF = "/dashboard"

function withReturn(href: string) {
  return `${href}${href.includes("?") ? "&" : "?"}return=${encodeURIComponent(RETURN_HREF)}`
}

export type DashboardQuickActionsTab = "wallet" | "lend" | "borrow" | "multiply" | "rewards"

/**
 * Compact icon quick-action rail used across the dashboard hero — a bare row
 * of six circular icon buttons. The heading is intentionally omitted; the
 * buttons themselves communicate the affordance in every position they're
 * slotted (desktop stat-cards header, mobile rewards summary).
 */
export function DashboardQuickActions({ activeTab }: { activeTab?: DashboardQuickActionsTab }) {
  const { t } = useTranslation()
  const depositHref = activeTab === "borrow" ? actionPagePath("borrow", "supply") : actionPagePath("lend", "deposit")
  const withdrawHref = activeTab === "borrow" ? actionPagePath("borrow", "remove") : actionPagePath("lend", "withdraw")

  const actions = [
    {
      id: "borrow",
      label: t("Borrow"),
      icon: CircleArrowOutDownRight,
      href: withReturn(actionPagePath("borrow", "borrow")),
    },
    {
      id: "repay",
      label: t("Repay"),
      icon: CircleArrowOutUpLeft,
      href: withReturn(actionPagePath("borrow", "repay")),
    },
    {
      id: "deposit",
      label: t("Deposit"),
      icon: EnteringGeoFence,
      href: withReturn(depositHref),
    },
    {
      id: "withdraw",
      label: t("Withdraw"),
      icon: LeavingGeoFence,
      href: withReturn(withdrawHref),
    },
    {
      id: "multiply",
      label: t("Multiply"),
      icon: ArrowUpRightStack,
      href: withReturn(actionPagePath("multiply", "multiply")),
    },
    {
      id: "deleverage",
      label: t("Deleverage"),
      icon: ArrowShrink,
      href: withReturn(actionPagePath("multiply", "deleverage")),
    },
  ]

  return (
    <div aria-label={t("Quick actions")} role="group" className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.id}
            href={action.href}
            aria-label={action.label}
            title={action.label}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-field-bottom text-foreground shadow-sm transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-[0.98] dark:bg-field-bottom dark:text-white dark:hover:bg-hover"
          >
            <Icon className="size-4 shrink-0" aria-hidden />
          </Link>
        )
      })}
    </div>
  )
}
