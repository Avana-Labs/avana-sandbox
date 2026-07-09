"use client"

import { Eye, EyeOff } from "lucide-react"
import { HeroBalanceDisplay } from "@/app/components/charts/hero-balance-display"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"

// TODO(backend): wire these to the user's real Avana balance.
const AVANA_BALANCE = "$14,400.00"
const AVANA_BALANCE_DELTA = "-$312.96 (-3.80%)"

export function PortfolioHeroHeader() {
  const { t } = useTranslation()
  const { showDollarAmounts, toggleShowDollarAmounts } = useDisplayPreferences()

  return (
    <div className="mb-4 sm:mb-6">
      {/* Kept for screen readers / internal recognition; hidden visually per design. */}
      <span className="sr-only">{t("User Avana balance")}</span>
      <HeroBalanceDisplay
        value={AVANA_BALANCE}
        delta={AVANA_BALANCE_DELTA}
        deltaTone="negative"
        meta="Today"
        hidden={!showDollarAmounts}
        valueSuffix={
          <button
            type="button"
            onClick={toggleShowDollarAmounts}
            aria-label={t("Dollar amounts")}
            aria-pressed={showDollarAmounts}
            className="inline-flex shrink-0 items-center text-brand-readable transition-opacity hover:opacity-80"
          >
            {showDollarAmounts ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </button>
        }
      />
    </div>
  )
}
