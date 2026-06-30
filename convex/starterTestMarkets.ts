export const STARTER_TEST_MARKETS = [
  ...Array.from({ length: 12 }, (_, index) => ({
    scope: "asset" as const,
    slug: `asset-${index}`,
    name: `Asset ${index}`,
    symbol: index === 0 ? "USDC" : `A${index}`,
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    scope: "pool" as const,
    slug: `pool-${index}`,
    name: `Pool ${index}`,
    symbol: `LP${index}`,
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    scope: "lend" as const,
    slug: `lend-${index}`,
    name: `Lend ${index}`,
    symbol: `L${index}`,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    scope: "multiply" as const,
    slug: `multiply-${index}`,
    name: `Multiply ${index}`,
    symbol: `M${index}`,
  })),
]
