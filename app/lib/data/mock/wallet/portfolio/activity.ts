import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio/types"

type WalletActivitySeed = Omit<PortfolioActivityRow, "id" | "at" | "txHashShort" | "txHref">

const ACTIVITY_SEEDS: Array<WalletActivitySeed & { minutesAgo: number }> = [
  { minutesAgo: 1, product: "pool", kind: "pledge", status: "confirmed", amountLabel: "$42.2K", primaryLabel: "WETH / USDC", secondaryLabel: "Uniswap v3 Bluechip collateral", txHash: "" },
  { minutesAgo: 4, product: "multiply", kind: "addCollateral", status: "pending", amountLabel: "$8.4K", primaryLabel: "ETH Loop", secondaryLabel: "Added collateral to 4.0x long", txHash: "" },
  { minutesAgo: 8, product: "lend", kind: "supply", status: "confirmed", amountLabel: "+$34.6K", primaryLabel: "DAI", secondaryLabel: "Supply market deposit", txHash: "" },
  { minutesAgo: 12, product: "borrow", kind: "borrow", status: "confirmed", amountLabel: "-$12.4K", primaryLabel: "USDC", secondaryLabel: "Borrowed against LP collateral", txHash: "" },
  { minutesAgo: 19, product: "pool", kind: "claim", status: "confirmed", amountLabel: "$6.4K", primaryLabel: "wstETH / WETH", secondaryLabel: "Claimed collateral incentives", txHash: "" },
  { minutesAgo: 27, product: "multiply", kind: "rebalance", status: "confirmed", amountLabel: "$9.8K", primaryLabel: "cbBTC Basis", secondaryLabel: "Range rebalance executed", txHash: "" },
  { minutesAgo: 35, product: "lend", kind: "withdraw", status: "pending", amountLabel: "-$15.4K", primaryLabel: "USDT", secondaryLabel: "Yield withdrawal requested", txHash: "" },
  { minutesAgo: 43, product: "borrow", kind: "repay", status: "confirmed", amountLabel: "+$8.1K", primaryLabel: "DAI", secondaryLabel: "Debt repayment", txHash: "" },
  { minutesAgo: 58, product: "pool", kind: "pledge", status: "confirmed", amountLabel: "$26.8K", primaryLabel: "WBTC / WETH", secondaryLabel: "Aerodrome LP pledged", txHash: "" },
  { minutesAgo: 76, product: "multiply", kind: "open", status: "confirmed", amountLabel: "$33.6K", primaryLabel: "SOL Momentum", secondaryLabel: "Opened 3.0x multiply position", txHash: "" },
  { minutesAgo: 92, product: "lend", kind: "interest", status: "confirmed", amountLabel: "$1.9K", primaryLabel: "USDC", secondaryLabel: "Interest settled to wallet", txHash: "" },
  { minutesAgo: 118, product: "borrow", kind: "withdraw", status: "failed", amountLabel: "-$4.8K", primaryLabel: "crvUSD", secondaryLabel: "Borrow market withdrawal reverted", txHash: "" },
  { minutesAgo: 155, product: "pool", kind: "claim", status: "confirmed", amountLabel: "$1.3K", primaryLabel: "cbBTC / WETH", secondaryLabel: "Fee claim settled", txHash: "" },
  { minutesAgo: 188, product: "multiply", kind: "reduce", status: "confirmed", amountLabel: "-$11.2K", primaryLabel: "ETH Loop", secondaryLabel: "Reduced collateral exposure", txHash: "" },
  { minutesAgo: 240, product: "lend", kind: "supply", status: "confirmed", amountLabel: "+$19.4K", primaryLabel: "USDC", secondaryLabel: "Supply market deposit", txHash: "" },
  { minutesAgo: 318, product: "borrow", kind: "liquidation", status: "confirmed", amountLabel: "$3.6K", primaryLabel: "WETH / USDT", secondaryLabel: "Liquidation incentive received", txHash: "" },
  { minutesAgo: 402, product: "pool", kind: "pledge", status: "pending", amountLabel: "$14.3K", primaryLabel: "USDC / USDT", secondaryLabel: "LP collateral transfer pending", txHash: "" },
  { minutesAgo: 525, product: "multiply", kind: "close", status: "confirmed", amountLabel: "-$22.5K", primaryLabel: "ARB Carry", secondaryLabel: "Position closed and debt settled", txHash: "" },
]

function hashString(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function buildTxHash(seed: number, index: number) {
  let value = seed + index * 7919
  let hash = "0x"
  for (let position = 0; position < 64; position += 1) {
    value = Math.imul(value ^ (value >>> 13), 1274126177)
    hash += ((value >>> 28) & 0xf).toString(16)
  }
  return hash
}

function shortHash(txHash: string) {
  return `${txHash.slice(0, 6)}…${txHash.slice(-4)}`
}

export function getWalletActivity(walletProfileId: string) {
  const walletSeed = hashString(walletProfileId.toLowerCase())
  const now = Date.now()

  return ACTIVITY_SEEDS.map((seed, index) => {
    const txHash = buildTxHash(walletSeed, index)
    return {
      id: `${walletProfileId}-${index}`,
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
