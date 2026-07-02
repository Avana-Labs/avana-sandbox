type DetailQuickStat = {
  id: string
  value: string
  delta?: unknown
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

type DetailContentOverlay = {
  description: string
  stats: unknown[]
  history?: string
  faqs?: unknown[]
}

type DetailWithContent<About, Faqs> = {
  about: About
  faqs: Faqs
}

export function applyDetailContentOverlay<
  About extends { description: string; stats: unknown[]; history?: string },
  Faqs,
>(
  detail: DetailWithContent<About, Faqs>,
  content: DetailContentOverlay | null | undefined,
): DetailWithContent<About, Faqs> {
  if (!content) return detail
  return {
    ...detail,
    about: {
      ...detail.about,
      description: content.description,
      stats: content.stats,
      history: content.history,
    },
    faqs: (content.faqs ?? detail.faqs) as Faqs,
  }
}
