"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SESSION_CACHE_VERSION } from "@/app/lib/session-cache-version"
import { safeReadParsed, safeRemoveItem, safeSetItem } from "@/app/lib/safe-local-storage"

export type UmbrellaMarketId = "gho" | "usdc" | "usdt" | "weth"
export type UmbrellaActionKind = "stake" | "claim" | "startCooldown" | "unstake"

export type UmbrellaMarket = {
  id: UmbrellaMarketId
  asset: string
  symbol: string
  coverage: string
  totalStakedUsd: number
  apy: number
  baseApy: number
  rewardApy: number
  priceUsd: number
  targetCoverageUsd: number
  currentDeficitUsd: number
  deficitOffsetUsd: number
}

export type UmbrellaPosition = {
  marketId: UmbrellaMarketId
  amount: number
  valueUsd: number
  pendingRewardsUsd: number
  claimedRewardsUsd: number
  cooldownAmount: number
  cooldownValueUsd: number
  cooldownStatus: "idle" | "cooling" | "ready"
  cooldownRemaining: string
  removesIn: string
  updatedAt: number
}

export type UmbrellaTransaction = {
  id: string
  walletId: string
  kind: UmbrellaActionKind
  marketId: UmbrellaMarketId
  symbol: string
  amount: number
  amountUsd: number
  status: "success" | "failed"
  hash: string
  timestamp: number
}

export type UmbrellaState = {
  walletId: string
  walletBalances: Record<UmbrellaMarketId, number>
  markets: Record<UmbrellaMarketId, UmbrellaMarket>
  positions: Record<UmbrellaMarketId, UmbrellaPosition>
  transactions: UmbrellaTransaction[]
}

export type ConvexUmbrellaSessionState = {
  walletId: string
  markets?: Record<UmbrellaMarketId, UmbrellaMarket>
  walletBalances: Record<UmbrellaMarketId, number>
  positions: Array<{
    marketId: UmbrellaMarketId
    suppliedUsd: number
    amount: number
    pendingRewardsUsd: number
    claimedRewardsUsd: number
    cooldownUsd: number
    cooldownStartedAt?: number
    cooldownEndsAt?: number
    withdrawalWindowEndsAt?: number
    status: "open" | "closed"
    lastUpdatedAt: number
  }>
  transactions: Array<{
    id: string
    kind: UmbrellaActionKind
    marketId: UmbrellaMarketId
    amountUsd: number
    syntheticTxHash: string
    status: "success" | "failed" | "pending"
    at: number
  }>
}

export type PersistUmbrellaAction = (args: {
  intentId: string
  kind: UmbrellaActionKind
  marketId: UmbrellaMarketId
  amount: number
}) => Promise<unknown>

const UMBRELLA_STATE_PREFIX = `avana.umbrella.session.${SESSION_CACHE_VERSION}`

export const UMBRELLA_MARKET_ORDER: UmbrellaMarketId[] = ["gho", "usdc", "usdt", "weth"]

function stateKey(walletId: string) {
  return `${UMBRELLA_STATE_PREFIX}:${walletId}`
}

function txHash(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `0xumb${hash.toString(16).padStart(8, "0")}`
}

export function buildDefaultUmbrellaState(walletId: string): UmbrellaState {
  const now = Date.UTC(2026, 7, 14, 12)
  const markets: Record<UmbrellaMarketId, UmbrellaMarket> = {
    gho: {
      id: "gho",
      asset: "Stake GHO",
      symbol: "GHO",
      coverage: "GHO deficits",
      totalStakedUsd: 25_000_000,
      apy: 6.4,
      baseApy: 0,
      rewardApy: 6.4,
      priceUsd: 1,
      targetCoverageUsd: 22_000_000,
      currentDeficitUsd: 146,
      deficitOffsetUsd: 3_000_000,
    },
    usdc: {
      id: "usdc",
      asset: "Stake USDC",
      symbol: "USDC",
      coverage: "USDC deficits",
      totalStakedUsd: 12_000_000,
      apy: 4.84,
      baseApy: 1.72,
      rewardApy: 3.12,
      priceUsd: 1,
      targetCoverageUsd: 10_000_000,
      currentDeficitUsd: 51_371,
      deficitOffsetUsd: 2_000_000,
    },
    usdt: {
      id: "usdt",
      asset: "Stake USDT",
      symbol: "USDT",
      coverage: "USDT deficits",
      totalStakedUsd: 11_000_000,
      apy: 4.19,
      baseApy: 1.34,
      rewardApy: 2.85,
      priceUsd: 1,
      targetCoverageUsd: 9_500_000,
      currentDeficitUsd: 32_420,
      deficitOffsetUsd: 1_500_000,
    },
    weth: {
      id: "weth",
      asset: "Stake WETH",
      symbol: "WETH",
      coverage: "WETH deficits",
      totalStakedUsd: 7_000_000,
      apy: 5.05,
      baseApy: 2.65,
      rewardApy: 2.4,
      priceUsd: 2240,
      targetCoverageUsd: 6_250_000,
      currentDeficitUsd: 52_973,
      deficitOffsetUsd: 750_000,
    },
  }

  return {
    walletId,
    walletBalances: { gho: 20_000, usdc: 25_000, usdt: 15_000, weth: 5 },
    markets,
    positions: {
      gho: {
        marketId: "gho",
        amount: 9500,
        valueUsd: 9500,
        pendingRewardsUsd: 26.14,
        claimedRewardsUsd: 0,
        cooldownAmount: 0,
        cooldownValueUsd: 0,
        cooldownStatus: "idle",
        cooldownRemaining: "-",
        removesIn: "After 20 days",
        updatedAt: now,
      },
      usdc: {
        marketId: "usdc",
        amount: 12_000,
        valueUsd: 12_000,
        pendingRewardsUsd: 18.72,
        claimedRewardsUsd: 0,
        cooldownAmount: 3000,
        cooldownValueUsd: 3000,
        cooldownStatus: "cooling",
        cooldownRemaining: "4d 11h",
        removesIn: "4d 11h",
        updatedAt: now,
      },
      usdt: {
        marketId: "usdt",
        amount: 11_000,
        valueUsd: 11_000,
        pendingRewardsUsd: 12.4,
        claimedRewardsUsd: 0,
        cooldownAmount: 5000,
        cooldownValueUsd: 5000,
        cooldownStatus: "ready",
        cooldownRemaining: "Ready",
        removesIn: "0d 0h",
        updatedAt: now,
      },
      weth: {
        marketId: "weth",
        amount: 3.125,
        valueUsd: 7000,
        pendingRewardsUsd: 9.2,
        claimedRewardsUsd: 0,
        cooldownAmount: 0,
        cooldownValueUsd: 0,
        cooldownStatus: "idle",
        cooldownRemaining: "-",
        removesIn: "After 20 days",
        updatedAt: now,
      },
    },
    transactions: [],
  }
}

function readUmbrellaState(walletId: string) {
  return safeReadParsed<UmbrellaState>(
    stateKey(walletId),
    (raw) => JSON.parse(raw) as UmbrellaState,
    () => buildDefaultUmbrellaState(walletId),
  )
}

function writeUmbrellaState(walletId: string, state: UmbrellaState) {
  safeSetItem(stateKey(walletId), JSON.stringify(state))
}

function clampAmount(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function cooldownLabel(position: ConvexUmbrellaSessionState["positions"][number]) {
  const now = Date.now()
  if (!position.cooldownEndsAt || position.cooldownUsd <= 0) return { status: "idle" as const, remaining: "-", removesIn: "After 20 days" }
  if (now >= position.cooldownEndsAt) return { status: "ready" as const, remaining: "Ready", removesIn: "0d 0h" }
  const remainingHours = Math.ceil((position.cooldownEndsAt - now) / (60 * 60 * 1000))
  const days = Math.floor(remainingHours / 24)
  const hours = remainingHours % 24
  return { status: "cooling" as const, remaining: `${days}d ${hours}h`, removesIn: `${days}d ${hours}h` }
}

function stateFromConvex(walletId: string, remote: ConvexUmbrellaSessionState): UmbrellaState {
  const fallback = buildDefaultUmbrellaState(walletId)
  const markets = remote.markets ?? fallback.markets
  const positions = { ...fallback.positions }
  for (const remotePosition of remote.positions) {
    const market = markets[remotePosition.marketId]
    const labels = cooldownLabel(remotePosition)
    positions[remotePosition.marketId] = {
      marketId: remotePosition.marketId,
      amount: remotePosition.amount,
      valueUsd: remotePosition.suppliedUsd,
      pendingRewardsUsd: remotePosition.pendingRewardsUsd,
      claimedRewardsUsd: remotePosition.claimedRewardsUsd,
      cooldownAmount: market.priceUsd > 0 ? remotePosition.cooldownUsd / market.priceUsd : remotePosition.cooldownUsd,
      cooldownValueUsd: remotePosition.cooldownUsd,
      cooldownStatus: labels.status,
      cooldownRemaining: labels.remaining,
      removesIn: labels.removesIn,
      updatedAt: remotePosition.lastUpdatedAt,
    }
  }
  return {
    walletId,
    walletBalances: { ...fallback.walletBalances, ...remote.walletBalances },
    markets,
    positions,
    transactions: remote.transactions.map((row) => {
      const market = markets[row.marketId]
      return {
        id: row.id,
        walletId,
        kind: row.kind,
        marketId: row.marketId,
        symbol: market.symbol,
        amount: market.priceUsd > 0 ? row.amountUsd / market.priceUsd : row.amountUsd,
        amountUsd: row.amountUsd,
        status: row.status === "pending" ? "success" : row.status,
        hash: row.syntheticTxHash,
        timestamp: row.at,
      }
    }),
  }
}

export function useUmbrellaSession({
  walletId,
  persistState = true,
  remoteState,
  persistAction,
}: {
  walletId: string
  persistState?: boolean
  remoteState?: ConvexUmbrellaSessionState | null
  persistAction?: PersistUmbrellaAction
}) {
  const seededState = useMemo(() => buildDefaultUmbrellaState(walletId), [walletId])
  const [state, setState] = useState<UmbrellaState>(seededState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (remoteState) {
      setState(stateFromConvex(walletId, remoteState))
      return
    }
    setState(persistState ? readUmbrellaState(walletId) : buildDefaultUmbrellaState(walletId))
  }, [persistState, remoteState, walletId])

  useEffect(() => {
    if (!persistState || state.walletId !== walletId) return
    writeUmbrellaState(walletId, state)
  }, [persistState, state, walletId])

  const execute = useCallback(
    async (kind: UmbrellaActionKind, marketId: UmbrellaMarketId, rawAmount: number) => {
      const amount = clampAmount(rawAmount)
      if (kind !== "claim" && amount <= 0) throw new Error("Amount must be positive")

      if (persistAction) {
        await persistAction({
          intentId: `umbrella-${kind}-${marketId}-${Date.now()}`,
          kind,
          marketId,
          amount,
        })
      }

      let result: UmbrellaTransaction | null = null
      setState((current) => {
        const market = current.markets[marketId]
        const position = current.positions[marketId]
        const balance = current.walletBalances[marketId] ?? 0
        const amountUsd = amount * market.priceUsd

        if (kind === "stake" && amount > balance) throw new Error(`Insufficient ${market.symbol} balance`)
        if (kind === "startCooldown" && amount > position.amount - position.cooldownAmount) {
          throw new Error(`Insufficient active ${market.symbol}`)
        }
        if (kind === "unstake" && amount > position.cooldownAmount) {
          throw new Error(`Insufficient cooled ${market.symbol}`)
        }
        if (kind === "claim" && position.pendingRewardsUsd <= 0) throw new Error("No Umbrella rewards to claim")

        const nextBalance = kind === "stake" ? balance - amount : kind === "unstake" ? balance + amount : balance
        const nextPositionAmount =
          kind === "stake" ? position.amount + amount : kind === "unstake" ? position.amount - amount : position.amount
        const nextPositionValueUsd = nextPositionAmount * market.priceUsd
        const timestamp = Date.now()
        const id = `umbrella-${kind}-${marketId}-${timestamp}`
        const txAmountUsd = kind === "claim" ? position.pendingRewardsUsd : amountUsd
        result = {
          id,
          walletId,
          kind,
          marketId,
          symbol: market.symbol,
          amount,
          amountUsd: txAmountUsd,
          status: "success",
          hash: txHash(id),
          timestamp,
        }

        return {
          ...current,
          walletBalances: { ...current.walletBalances, [marketId]: nextBalance },
          markets: {
            ...current.markets,
            [marketId]: {
              ...market,
              totalStakedUsd:
                kind === "stake"
                  ? market.totalStakedUsd + amountUsd
                  : kind === "unstake"
                    ? Math.max(0, market.totalStakedUsd - amountUsd)
                    : market.totalStakedUsd,
            },
          },
          positions: {
            ...current.positions,
            [marketId]: {
              ...position,
              amount: nextPositionAmount,
              valueUsd: nextPositionValueUsd,
              pendingRewardsUsd: kind === "claim" ? 0 : position.pendingRewardsUsd,
              claimedRewardsUsd:
                kind === "claim" ? position.claimedRewardsUsd + position.pendingRewardsUsd : position.claimedRewardsUsd,
              cooldownAmount:
                kind === "startCooldown"
                  ? position.cooldownAmount + amount
                  : kind === "unstake"
                    ? Math.max(0, position.cooldownAmount - amount)
                    : position.cooldownAmount,
              cooldownValueUsd:
                kind === "startCooldown"
                  ? position.cooldownValueUsd + amountUsd
                  : kind === "unstake"
                    ? Math.max(0, position.cooldownValueUsd - amountUsd)
                    : position.cooldownValueUsd,
              cooldownStatus:
                kind === "startCooldown" ? "cooling" : kind === "stake" ? "idle" : position.cooldownStatus,
              cooldownRemaining: kind === "startCooldown" ? "20d 0h" : position.cooldownRemaining,
              removesIn: kind === "startCooldown" ? "20d 0h" : position.removesIn,
              updatedAt: timestamp,
            },
          },
          transactions: [result, ...current.transactions],
        }
      })

      if (!result) throw new Error("Umbrella transaction failed")
      return result
    },
    [persistAction, walletId],
  )

  const reset = useCallback(() => {
    if (persistState) safeRemoveItem(stateKey(walletId))
    setState(buildDefaultUmbrellaState(walletId))
  }, [persistState, walletId])

  return {
    walletId,
    markets: state.markets,
    marketOrder: UMBRELLA_MARKET_ORDER,
    walletBalances: state.walletBalances,
    positions: state.positions,
    transactionHistory: state.transactions,
    stake: useCallback((marketId: UmbrellaMarketId, amount: number) => execute("stake", marketId, amount), [execute]),
    claim: useCallback((marketId: UmbrellaMarketId) => execute("claim", marketId, 0), [execute]),
    startCooldown: useCallback(
      (marketId: UmbrellaMarketId, amount: number) => execute("startCooldown", marketId, amount),
      [execute],
    ),
    unstake: useCallback((marketId: UmbrellaMarketId, amount: number) => execute("unstake", marketId, amount), [execute]),
    reset,
  }
}
