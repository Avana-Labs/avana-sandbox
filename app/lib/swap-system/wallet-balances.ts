import { SWAP_CHAIN_ID, getSwapAsset } from "./catalog"
import { getSwapEligibility } from "./eligibility"
import type { SwapContext, SwapRestrictionReason, UserAssetBalance } from "./contracts"

export type DashboardWalletBalanceRow = {
  id: string
  assetId: string
  symbol: string
  name: string
  amount: number
  valueUsd: number
  sourceLabel: string
  isLpToken: boolean
  isWalletHeld: boolean
  swappable: boolean
  restrictionReason: SwapRestrictionReason | null
}

export const DEMO_SWAP_BALANCES: UserAssetBalance[] = [
  {
    id: "wallet-eth",
    walletId: "demo-wallet",
    assetId: "eth",
    amount: 0.012,
    sourceType: "wallet",
  },
  {
    id: "wallet-usdc",
    walletId: "demo-wallet",
    assetId: "usdc",
    amount: 840,
    sourceType: "wallet",
  },
  {
    id: "wallet-link",
    walletId: "demo-wallet",
    assetId: "link",
    amount: 24,
    sourceType: "wallet",
  },
  {
    id: "wallet-eth-usdc-lp",
    walletId: "demo-wallet",
    assetId: "eth-usdc-lp",
    amount: 6.4,
    sourceType: "wallet",
  },
  {
    id: "lend-deposited-gho",
    walletId: "demo-wallet",
    assetId: "gho",
    amount: 1250,
    sourceType: "lend_deposited",
    sourcePositionId: "lend-gho",
  },
  {
    id: "multiply-active-eth",
    walletId: "demo-wallet",
    assetId: "eth",
    amount: 3,
    sourceType: "multiply_active",
    sourcePositionId: "multiply-eth-usdc",
  },
]

function sourceLabel(sourceType: UserAssetBalance["sourceType"]) {
  switch (sourceType) {
    case "wallet":
      return "Wallet"
    case "lend_deposited":
      return "Lend deposited"
    case "borrow_collateral_unpledged":
      return "Borrow collateral"
    case "borrow_collateral_pledged":
      return "Pledged collateral"
    case "borrow_debt":
      return "Borrow debt"
    case "borrow_claimable":
      return "Pool fees"
    case "multiply_available":
      return "Multiply available"
    case "multiply_active":
      return "Active loop"
    case "multiply_debt":
      return "Loop debt"
    case "protocol_locked":
      return "Protocol locked"
  }
}

export function getUserSwapBalances(walletId: string, balances: UserAssetBalance[] = DEMO_SWAP_BALANCES) {
  return balances.filter((balance) => balance.walletId === walletId)
}

export function buildDashboardWalletBalanceRows({
  walletId,
  balances = DEMO_SWAP_BALANCES,
  context = { originProduct: "wallet", chainId: SWAP_CHAIN_ID },
}: {
  walletId: string
  balances?: UserAssetBalance[]
  context?: SwapContext
}): DashboardWalletBalanceRow[] {
  const merged = new Map<string, UserAssetBalance>()
  for (const balance of getUserSwapBalances(walletId, balances)) {
    const valueUsd = balance.valueUsd ?? balance.amount * (getSwapAsset(balance.assetId)?.priceUsd ?? 0)
    if (balance.amount <= 0 && valueUsd <= 0) continue
    const asset = getSwapAsset(balance.assetId)
    const key = asset?.isLpToken ? `${balance.assetId}:${balance.sourceType}` : balance.id
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, { ...balance, valueUsd })
      continue
    }
    merged.set(key, {
      ...existing,
      amount: existing.amount + balance.amount,
      valueUsd: (existing.valueUsd ?? existing.amount * (getSwapAsset(existing.assetId)?.priceUsd ?? 0)) + valueUsd,
    })
  }

  return [...merged.values()]
    .map((balance) => {
      const asset = getSwapAsset(balance.assetId)
      const eligibility = getSwapEligibility(balance, context)
      const valueUsd = balance.valueUsd ?? balance.amount * (asset?.priceUsd ?? 0)
      return {
        id: balance.id,
        assetId: balance.assetId,
        symbol: asset?.symbol ?? balance.assetId.toUpperCase(),
        name: asset?.name ?? "Unsupported asset",
        amount: balance.amount,
        valueUsd,
        sourceLabel: sourceLabel(balance.sourceType),
        isLpToken: asset?.isLpToken ?? false,
        isWalletHeld: balance.sourceType === "wallet",
        swappable: eligibility.eligible,
        restrictionReason: eligibility.eligible ? null : eligibility.reason,
      }
    })
    .sort((left, right) => right.valueUsd - left.valueUsd)
}
