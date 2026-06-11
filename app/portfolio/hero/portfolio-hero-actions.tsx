"use client"

import { PortfolioHeroActionCard } from "./portfolio-hero-action-card"
import type { PortfolioHeroAction } from "./types"

type PortfolioHeroActionsProps = {
  actions: PortfolioHeroAction[]
}

/**
 * Quick-action rail for the portfolio hero.
 * Kept as its own segment so each action can later open a popup/dialog.
 */
export function PortfolioHeroActions({ actions }: PortfolioHeroActionsProps) {
  return (
    <section aria-label="Portfolio quick actions" className="min-w-0">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
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
