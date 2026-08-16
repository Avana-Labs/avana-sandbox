import { formatTokenPrice } from "@/app/lib/prices/format"
import { sandboxBaselinePriceUsd } from "@/app/lib/prices/sandbox-baseline-prices"

type DetailQuickStat = {
  id: string
  value: string
  delta?: unknown
}

/**
 * Pin the detail-page "Price" quick stat to the deterministic sandbox baseline for
 * `baseSymbol` — the SAME price that VALUES this token everywhere else in the sandbox
 * (catalog/read-model valuations). Every product detail builder used to overlay the live
 * DefiLlama oracle here instead, so the tile disagreed with the valuation it sat next to
 * (e.g. multiply aave-gho showed AAVE ~$86 while 5 AAVE of collateral was valued at the
 * $105 baseline). Reading the baseline keeps the tile and the valuation in agreement and
 * makes the sandbox internally consistent and deterministic across borrow, lend, and
 * multiply detail pages.
 */
export function injectBaselinePrice<T extends DetailQuickStat>(quickStats: T[], baseSymbol: string): T[] {
  const value = formatTokenPrice(sandboxBaselinePriceUsd(baseSymbol))
  return quickStats.map((stat) => (stat.id === "price" ? { ...stat, value } : stat))
}

export function mergeAliasedQuickStats<T extends DetailQuickStat>(
  base: T[],
  convex: ReadonlyArray<{ id: string; value: string; delta?: T["delta"] }> | null,
  aliases: Record<string, string[]>,
): T[] {
  if (!convex || convex.length === 0) return base
  const byMockId = new Map<string, { value: string; delta?: T["delta"] }>()
  for (const item of convex) {
    for (const mockId of aliases[item.id] ?? [item.id]) byMockId.set(mockId, item)
  }
  return base.map((stat) => {
    const next = byMockId.get(stat.id)
    return next ? { ...stat, value: next.value, delta: next.delta ?? stat.delta } : stat
  })
}

type AboutContent = {
  description: string
  stats: Array<{ label: string; value: string; href?: string }>
  history: Array<{ date: string; title: string; description?: string }>
}

type FaqEntry = { question: string; answer: string }

type DetailContentOverlay = AboutContent & {
  faqs: FaqEntry[]
}

type DetailWithContent = {
  about: AboutContent
  faqs: FaqEntry[]
}

export type DetailContentOverlayOptions = {
  /**
   * Live mode: when Convex content is missing, clear catalog About/FAQs/history
   * instead of silently re-pinning mock editorial. Mock/open-gate leaves base intact.
   */
  clearWhenMissing?: boolean
}

/** Prefer Convex editorial content (About + FAQs); keep any base-only about fields. */
export function applyDetailContentOverlay<T extends DetailWithContent>(
  detail: T,
  content: DetailContentOverlay | null | undefined,
  options: DetailContentOverlayOptions = {},
): T {
  if (!content) {
    if (!options.clearWhenMissing) return detail
    return {
      ...detail,
      about: {
        ...detail.about,
        description: "",
        stats: [],
        history: [],
      },
      faqs: [],
    } as T
  }
  return {
    ...detail,
    about: {
      ...detail.about,
      description: content.description,
      stats: content.stats,
      history: content.history,
    },
    faqs: content.faqs,
  } as T
}
