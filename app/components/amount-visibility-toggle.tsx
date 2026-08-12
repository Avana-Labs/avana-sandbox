"use client"

import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { Switch } from "@/components/ui/switch"

export function AmountVisibilityToggle() {
  const { t } = useTranslation()
  const { showDollarAmounts, setShowDollarAmounts } = useAmountDisplayPreferences()
  const label = showDollarAmounts ? t("Hide Numbers") : t("Show Numbers")

  return (
    <div className="flex items-center gap-3">
      <span className="text-[14px] font-semibold text-muted-foreground">{label}</span>
      <Switch
        checked={showDollarAmounts}
        onCheckedChange={setShowDollarAmounts}
        aria-label={label}
        className="h-5 w-9 border border-border p-px data-[state=checked]:bg-brand data-[state=unchecked]:bg-input [&>span]:h-4 [&>span]:w-4 [&>span]:bg-white [&>span]:data-[state=unchecked]:!translate-x-0 [&>span]:data-[state=checked]:!translate-x-4 dark:[&>span]:bg-white"
      />
    </div>
  )
}
