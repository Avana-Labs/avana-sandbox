"use client"

import { useState } from "react"
import { DashboardHeroActionCard } from "./dashboard-hero-action-card"
import { DashboardHeroActionPill } from "./dashboard-hero-action-card"
import type { DashboardHeroAction } from "./types"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type DashboardHeroActionsProps = {
  actions: DashboardHeroAction[]
}

/**
 * Quick-action rail for the dashboard hero.
 * Kept as its own segment so each action can later open a popup/dialog.
 */
export function DashboardHeroActions({ actions }: DashboardHeroActionsProps) {
  const { t } = useTranslation()
  const [activeMobileActionId, setActiveMobileActionId] = useState(actions[0]?.id)
  const [armedMobileActionId, setArmedMobileActionId] = useState<string | undefined>()

  const revealMobileAction = (id: string) => {
    setActiveMobileActionId(id)
    setArmedMobileActionId(id)
  }

  return (
    <section aria-label={t("Dashboard quick actions")} className="min-w-0">
      <div className="flex flex-wrap gap-2 md:hidden">
        {actions.map((action) => (
          <DashboardHeroActionPill
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
          <DashboardHeroActionCard
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
