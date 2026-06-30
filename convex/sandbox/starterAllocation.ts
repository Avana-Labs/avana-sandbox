export const STARTER_EQUITY_USD = 1_000_000

export const STARTER_BUCKETS = {
  liquid: { amountUsd: 100_000, count: 12 },
  collateral: { amountUsd: 350_000, count: 8 },
  lend: { amountUsd: 300_000, count: 8 },
  multiply: { amountUsd: 250_000, count: 6 },
} as const

export type StarterMarket = {
  slug: string
  scope: "asset" | "pool" | "lend" | "multiply"
}

export type StarterAllocationLeg = {
  marketSlug: string
  amountUsd: number
}

export type StarterAllocationPlan = {
  version: 1
  wallet: string
  totalEquityUsd: number
  liquid: StarterAllocationLeg[]
  collateral: StarterAllocationLeg[]
  lend: StarterAllocationLeg[]
  multiply: StarterAllocationLeg[]
}

function hashWallet(wallet: string) {
  let hash = 2166136261
  for (let index = 0; index < wallet.length; index += 1) {
    hash ^= wallet.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? left : greatestCommonDivisor(right, left % right)
}

function selectionStride(length: number, seed: number) {
  if (length <= 1) return 1
  let stride = (seed % (length - 1)) + 1
  while (greatestCommonDivisor(stride, length) !== 1) {
    stride = (stride % (length - 1)) + 1
  }
  return stride
}

function splitExact(amountUsd: number, count: number) {
  const totalCents = Math.round(amountUsd * 100)
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count
  return Array.from({ length: count }, (_, index) => (baseCents + (index < remainder ? 1 : 0)) / 100)
}

function allocateBucket(
  candidates: StarterMarket[],
  amountUsd: number,
  desiredCount: number,
  seed: number,
): StarterAllocationLeg[] {
  if (candidates.length === 0) {
    throw new Error("STARTER_CATALOG_INCOMPLETE: allocation bucket has no eligible markets.")
  }
  const normalizedSeed = seed >>> 0
  const count = Math.min(desiredCount, candidates.length)
  const start = normalizedSeed % candidates.length
  const stride = selectionStride(candidates.length, normalizedSeed >>> 8)
  const selected: StarterMarket[] = []
  const seen = new Set<number>()

  for (let cursor = 0; selected.length < count; cursor += 1) {
    const index = (start + cursor * stride) % candidates.length
    if (seen.has(index)) continue
    seen.add(index)
    selected.push(candidates[index]!)
  }

  const amounts = splitExact(amountUsd, selected.length)
  return selected.map((market, index) => ({
    marketSlug: market.slug,
    amountUsd: amounts[index]!,
  }))
}

export function buildStarterAllocationPlan(
  wallet: string,
  markets: readonly StarterMarket[],
): StarterAllocationPlan {
  const normalizedWallet = wallet.toLowerCase()
  const seed = hashWallet(normalizedWallet)
  const byScope = (scope: StarterMarket["scope"]) =>
    markets
      .filter((market) => market.scope === scope)
      .slice()
      .sort((left, right) => left.slug.localeCompare(right.slug))

  const plan: StarterAllocationPlan = {
    version: 1,
    wallet: normalizedWallet,
    totalEquityUsd: STARTER_EQUITY_USD,
    liquid: allocateBucket(byScope("asset"), STARTER_BUCKETS.liquid.amountUsd, STARTER_BUCKETS.liquid.count, seed),
    collateral: allocateBucket(
      byScope("pool"),
      STARTER_BUCKETS.collateral.amountUsd,
      STARTER_BUCKETS.collateral.count,
      seed ^ 0x9e3779b9,
    ),
    lend: allocateBucket(byScope("lend"), STARTER_BUCKETS.lend.amountUsd, STARTER_BUCKETS.lend.count, seed ^ 0x85ebca6b),
    multiply: allocateBucket(
      byScope("multiply"),
      STARTER_BUCKETS.multiply.amountUsd,
      STARTER_BUCKETS.multiply.count,
      seed ^ 0xc2b2ae35,
    ),
  }

  const total = [...plan.liquid, ...plan.collateral, ...plan.lend, ...plan.multiply].reduce(
    (sum, leg) => sum + leg.amountUsd,
    0,
  )
  if (Math.round(total * 100) !== STARTER_EQUITY_USD * 100) {
    throw new Error(`STARTER_ALLOCATION_INVALID: expected ${STARTER_EQUITY_USD}, received ${total}.`)
  }
  return plan
}
