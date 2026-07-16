"use client"

import { CircleArrowDown, CircleArrowUp, LogIn, LogOut } from "@/app/components/icons"
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
    { id: "borrow", label: t("Borrow"), icon: CircleArrowUp, href: withReturn(actionPagePath("borrow", "borrow")) },
    { id: "repay", label: t("Repay"), icon: LogIn, href: withReturn(actionPagePath("borrow", "repay")) },
    { id: "deposit", label: t("Deposit"), icon: CircleArrowDown, href: withReturn(actionPagePath("lend", "deposit")) },
    { id: "withdraw", label: t("Withdraw"), icon: LogOut, href: withReturn(actionPagePath("lend", "withdraw")) },
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
