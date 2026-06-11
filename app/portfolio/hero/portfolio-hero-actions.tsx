"use client"

import { PortfolioHeroActionCard } from "./portfolio-hero-action-card"
import type { PortfolioHeroAction, PortfolioHeroActionId } from "./types"

const COMPACT_ACTION_IDS: PortfolioHeroActionId[] = ["send", "buy"]

type PortfolioHeroActionsProps = {
  actions: PortfolioHeroAction[]
}

/**
 * Quick-action rail for the portfolio hero.
 * Kept as its own segment so each action can later open a popup/dialog.
 */
export function PortfolioHeroActions({ actions }: PortfolioHeroActionsProps) {
  const isCompactRail = actions.length <= 2
  const mobileActions = isCompactRail
    ? actions
    : actions.filter((action) => COMPACT_ACTION_IDS.includes(action.id))

  return (
    <section aria-label="Portfolio quick actions" className="min-w-0">
      <div className={`hidden gap-3 sm:grid ${actions.length <= 2 ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
        {actions.map((action) => (
          <PortfolioHeroActionCard
            key={action.id}
            label={action.label}
            icon={action.icon}
            onClick={action.onClick}
          />
        ))}
      </div>

      <div className={`grid gap-3 sm:hidden ${isCompactRail ? "grid-cols-1" : "grid-cols-1"}`}>
        {mobileActions.map((action) => (
          <PortfolioHeroActionCard
            key={action.id}
            label={action.label}
            icon={action.icon}
            onClick={action.onClick}
          />
        ))}
      </div>
    </section>
  )
}
