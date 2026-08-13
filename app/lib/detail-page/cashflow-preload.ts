import "server-only"
import { preloadQuery } from "convex/nextjs"
import type { Preloaded } from "convex/react"
import { api } from "@/convex/_generated/api"

/**
 * Server-side preload of a detail page's cashflow breakdown, handed to the client
 * `CashflowCard` live variant via `usePreloadedQuery` (hydrate + subscribe, no client
 * re-fetch — same handoff as the hero series / quick stats). All four product queries take
 * `{ slug }` and return the same CashflowCard shape, so the pool query's `Preloaded` type
 * is a structural stand-in for all of them. `null` when no deployment URL is configured.
 */
export type CashflowScope = "asset" | "pool" | "lend" | "multiply"
export type CashflowPreload = Preloaded<typeof api.borrow.cashflow.getBreakdownForPool>

export async function preloadDetailCashflow(scope: CashflowScope, slug: string): Promise<CashflowPreload | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || !/^https?:\/\//.test(url)) return null
  try {
    switch (scope) {
      case "pool":
        return await preloadQuery(api.borrow.cashflow.getBreakdownForPool, { slug })
      case "asset":
        return (await preloadQuery(api.borrow.cashflow.getBreakdownForAsset, { slug })) as CashflowPreload
      case "lend":
        return (await preloadQuery(api.lend.cashflow.getBreakdown, { slug })) as CashflowPreload
      case "multiply":
        return (await preloadQuery(api.multiply.cashflow.getBreakdown, { slug })) as CashflowPreload
    }
  } catch {
    return null
  }
}
