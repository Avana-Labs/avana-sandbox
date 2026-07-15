"use client"

import { Fragment, type ReactNode } from "react"
import { useLocaleDisplayPreferences } from "@/app/components/display-preferences"

/**
 * Shared market formatters read the active FX rate from a module. Recreate only
 * the rendered route when currency changes so every table/detail recalculates,
 * while the wallet and product sessions above this boundary remain intact.
 */
export function CurrencyDisplayBoundary({ children }: { children: ReactNode }) {
  const { currency, ratesVersion } = useLocaleDisplayPreferences()

  // Remount on a currency switch OR when live FX rates are (re)applied, so tables
  // and detail surfaces that read the module-level rate recalculate either way.
  return <Fragment key={`${currency}:${ratesVersion}`}>{children}</Fragment>
}
