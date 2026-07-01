"use client"

import { Fragment, type ReactNode } from "react"
import { useDisplayPreferences } from "@/app/components/display-preferences"

/**
 * Shared market formatters read the active FX rate from a module. Recreate only
 * the rendered route when currency changes so every table/detail recalculates,
 * while the wallet and product sessions above this boundary remain intact.
 */
export function CurrencyDisplayBoundary({ children }: { children: ReactNode }) {
  const { currency } = useDisplayPreferences()

  return <Fragment key={currency}>{children}</Fragment>
}
