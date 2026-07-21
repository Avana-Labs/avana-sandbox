"use client"

import { useState } from "react"
import { PortfolioHeroActionCard } from "./portfolio-hero-action-card"
import { PortfolioHeroActionPill } from "./portfolio-hero-action-card"
import type { PortfolioHeroAction } from "./types"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type PortfolioHeroActionsProps = {
  actions: PortfolioHeroAction[]
}

/**
 * Quick-action rail for the portfolio hero.
 * Kept as its own segment so each action can later open a popup/dialog.
 */
export function PortfolioHeroActions({ actions }: PortfolioHeroActionsProps) {
  const { t } = useTranslation()
  const [activeMobileActionId, setActiveMobileActionId] = useState(actions[0]?.id)
  const [armedMobileActionId, setArmedMobileActionId] = useState<string | undefined>()

  const revealMobileAction = (id: string) => {
    setActiveMobileActionId(id)
    setArmedMobileActionId(id)
  }

  return (
    <section aria-label={t("Portfolio quick actions")} className="min-w-0">
      <div className="flex flex-wrap gap-2 md:hidden">
        {actions.map((action) => (
          <PortfolioHeroActionPill
            key={action.id}
            label={action.label}
            icon={action.icon}
            href={action.href}
            onClick={action.onClick}
            className={action.className}
            active={activeMobileActionId === action.id}
            armed={armedMobileActionId === action.id}
            onActivate={() => revealMobileAction(action.id)}
          />
        ))}
      </div>

      <div className="hidden grid-cols-2 gap-3 md:grid">
        {actions.map((action) => (
          <PortfolioHeroActionCard
            key={action.id}
            label={action.label}
            icon={action.icon}
            href={action.href}
            onClick={action.onClick}
            className={action.className}
          />
        ))}
      </div>
    </section>
  )
}
