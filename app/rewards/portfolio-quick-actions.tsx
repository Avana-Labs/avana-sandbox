"use client"

import {
  ArrowShrink,
  ArrowUpRightStack,
  CircleArrowOutDownRight,
  CircleArrowOutUpLeft,
  EnteringGeoFence,
  LeavingGeoFence,
} from "@/app/components/icons"
import { PortfolioHeroActions } from "@/app/portfolio/hero/portfolio-hero-actions"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const RETURN_HREF = "/portfolio"

function withReturn(href: string) {
  return `${href}${href.includes("?") ? "&" : "?"}return=${encodeURIComponent(RETURN_HREF)}`
}

/**
 * Borrow / Repay / Deposit / Withdraw quick actions that used to live in the
 * dashboard hero — now a portfolio sidebar section beneath the claim action.
 */
export function PortfolioQuickActions() {
  const { t } = useTranslation()

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
      href: withReturn(actionPagePath("lend", "deposit")),
    },
    {
      id: "withdraw",
      label: t("Withdraw"),
      icon: LeavingGeoFence,
      href: withReturn(actionPagePath("lend", "withdraw")),
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
    <section aria-label={t("Quick actions")} className="min-w-0">
      <h3 className="mb-4 text-[16px] font-semibold tracking-tight text-foreground md:text-[17px]">
        {t("Quick actions")}
      </h3>
      <PortfolioHeroActions actions={actions} />
    </section>
  )
}
