"use client"

import { createContext, useContext } from "react"

/**
 * Whether the viewer may submit a transaction. The sandbox gate provides it: guests browse open
 * routes, and a signed-in wallet must finish onboarding (on the dashboard) before transacting.
 * Defaults to "ready" outside the gate (dev open gate, tests).
 */
export type TransactAccess = "ready" | "guest" | "needs-onboarding"

export const TransactAccessContext = createContext<TransactAccess>("ready")

export function useTransactAccess() {
  return useContext(TransactAccessContext)
}

/** Where a blocked primary CTA sends the viewer: the dashboard's onboarding flow. */
export const TRANSACT_ACCESS_HREF = "/dashboard"

/** Primary CTA label for a viewer who cannot transact yet, or null when they can. */
export function transactAccessCtaLabel(access: TransactAccess) {
  if (access === "guest") return "No Wallet Connected"
  if (access === "needs-onboarding") return "Complete onboarding"
  return null
}
