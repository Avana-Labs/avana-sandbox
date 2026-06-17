import type {
  PortfolioActivityKind,
  PortfolioActivityProduct,
  PortfolioActivityQuery,
  PortfolioActivityResponse,
  PortfolioActivityRow,
  PortfolioActivityStatus,
} from "./types"

type MockActivitySeed = {
  minutesAgo: number
  product: PortfolioActivityProduct
  kind: PortfolioActivityKind
  status: PortfolioActivityStatus
  amountLabel: string
  primaryLabel: string
  secondaryLabel: string
}

const MOCK_ACTIVITY_SEEDS: MockActivitySeed[] = [
  { minutesAgo: 1, product: "pool", kind: "pledge", status: "confirmed", amountLabel: "$184.2K", primaryLabel: "WETH / USDC", secondaryLabel: "Uniswap v3 Bluechip collateral" },
  { minutesAgo: 4, product: "multiply", kind: "addCollateral", status: "pending", amountLabel: "$42.8K", primaryLabel: "ETH Loop", secondaryLabel: "Added collateral to 4.0x long" },
  { minutesAgo: 8, product: "lend", kind: "supply", status: "confirmed", amountLabel: "+$95.1K", primaryLabel: "DAI", secondaryLabel: "Supply market deposit" },
  { minutesAgo: 12, product: "borrow", kind: "borrow", status: "confirmed", amountLabel: "-$38.4K", primaryLabel: "USDC", secondaryLabel: "Borrowed against LP collateral" },
  { minutesAgo: 19, product: "pool", kind: "claim", status: "confirmed", amountLabel: "$6.4K", primaryLabel: "wstETH / WETH", secondaryLabel: "Claimed collateral incentives" },
  { minutesAgo: 27, product: "multiply", kind: "rebalance", status: "confirmed", amountLabel: "$12.6K", primaryLabel: "cbBTC Basis", secondaryLabel: "Range rebalance executed" },
  { minutesAgo: 35, product: "lend", kind: "withdraw", status: "pending", amountLabel: "-$24.0K", primaryLabel: "USDT", secondaryLabel: "Yield withdrawal requested" },
  { minutesAgo: 43, product: "borrow", kind: "repay", status: "confirmed", amountLabel: "+$18.2K", primaryLabel: "DAI", secondaryLabel: "Debt repayment" },
  { minutesAgo: 58, product: "pool", kind: "pledge", status: "confirmed", amountLabel: "$96.8K", primaryLabel: "WBTC / WETH", secondaryLabel: "Aerodrome LP pledged" },
  { minutesAgo: 76, product: "multiply", kind: "open", status: "confirmed", amountLabel: "$210.0K", primaryLabel: "SOL Momentum", secondaryLabel: "Opened 3.0x multiply position" },
  { minutesAgo: 92, product: "lend", kind: "interest", status: "confirmed", amountLabel: "$3.8K", primaryLabel: "USDC", secondaryLabel: "Interest settled to wallet" },
  { minutesAgo: 118, product: "borrow", kind: "withdraw", status: "failed", amountLabel: "-$12.0K", primaryLabel: "crvUSD", secondaryLabel: "Borrow market withdrawal reverted" },
  { minutesAgo: 155, product: "pool", kind: "claim", status: "confirmed", amountLabel: "$1.9K", primaryLabel: "cbBTC / WETH", secondaryLabel: "Fee claim settled" },
  { minutesAgo: 188, product: "multiply", kind: "reduce", status: "confirmed", amountLabel: "-$51.7K", primaryLabel: "ETH Loop", secondaryLabel: "Reduced collateral exposure" },
  { minutesAgo: 240, product: "lend", kind: "supply", status: "confirmed", amountLabel: "+$220.0K", primaryLabel: "USDC", secondaryLabel: "Supply market deposit" },
  { minutesAgo: 318, product: "borrow", kind: "liquidation", status: "confirmed", amountLabel: "$9.6K", primaryLabel: "WETH / USDT", secondaryLabel: "Liquidation incentive received" },
  { minutesAgo: 402, product: "pool", kind: "pledge", status: "pending", amountLabel: "$74.3K", primaryLabel: "USDC / USDT", secondaryLabel: "LP collateral transfer pending" },
  { minutesAgo: 525, product: "multiply", kind: "close", status: "confirmed", amountLabel: "-$88.5K", primaryLabel: "ARB Carry", secondaryLabel: "Position closed and debt settled" },
]

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function buildTxHash(seed: number, index: number) {
  let value = seed + index * 7919
  let hash = "0x"

  for (let i = 0; i < 64; i++) {
    value = Math.imul(value ^ (value >>> 13), 1274126177)
    hash += ((value >>> 28) & 0xf).toString(16)
  }

  return hash
}

function shortHash(txHash: string) {
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
}

function buildMockRows(walletAddress: string): PortfolioActivityRow[] {
  const walletSeed = hashString(walletAddress.toLowerCase())
  const now = Date.now()

  return MOCK_ACTIVITY_SEEDS.map((seed, index) => {
    const txHash = buildTxHash(walletSeed, index)

    return {
      id: `${walletAddress}-${index}`,
      at: new Date(now - seed.minutesAgo * 60_000).toISOString(),
      product: seed.product,
      kind: seed.kind,
      status: seed.status,
      amountLabel: seed.amountLabel,
      primaryLabel: seed.primaryLabel,
      secondaryLabel: seed.secondaryLabel,
      txHash,
      txHashShort: shortHash(txHash),
      txHref: `https://etherscan.io/tx/${txHash}`,
    }
  })
}

export function getMockPortfolioActivity(query: PortfolioActivityQuery): PortfolioActivityResponse {
  const rows = buildMockRows(query.walletAddress)
    .filter((row) => (query.products?.length ? query.products.includes(row.product) : true))
    .filter((row) => (query.kinds?.length ? query.kinds.includes(row.kind) : true))
    .filter((row) => (query.statuses?.length ? query.statuses.includes(row.status) : true))

  const limit = query.limit ?? 50
  const items = rows.slice(0, limit)

  return {
    walletAddress: query.walletAddress,
    fetchedAt: new Date().toISOString(),
    nextCursor: rows.length > limit ? String(limit) : null,
    items,
  }
}
