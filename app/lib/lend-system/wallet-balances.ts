import { TOKENS } from "@/app/lib/data/mock/shared/lend"
import type { LendMarket } from "@/app/lib/lend-engine"
import { resolveLendMarketId } from "./catalog"

type WalletBalanceRecord = {
  walletId: string
  marketId: string
  symbol: string
  balance: number
}

const DEFAULT_WALLET_ID = "demo-wallet"

const WALLET_LEND_BALANCES: WalletBalanceRecord[] = TOKENS.map((token) => ({
  walletId: DEFAULT_WALLET_ID,
  marketId: resolveLendMarketId(token.symbol),
  symbol: token.symbol,
  balance: token.balance,
}))

export function getWalletBalanceForLendMarket(walletId: string, market: Pick<LendMarket, "marketId" | "asset">): number {
  const normalizedMarketId = resolveLendMarketId(market.marketId)
  const normalizedSymbol = market.asset.symbol.toUpperCase()

  const directMatch = WALLET_LEND_BALANCES.find(
    (entry) => entry.walletId === walletId && entry.marketId === normalizedMarketId,
  )
  if (directMatch) return directMatch.balance

  const symbolMatch = WALLET_LEND_BALANCES.find(
    (entry) => entry.walletId === walletId && entry.symbol.toUpperCase() === normalizedSymbol,
  )
  return symbolMatch?.balance ?? 0
}
