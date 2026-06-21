import { simulateDeleverage, simulateMultiply } from "./simulation"
import type { MultiplyAction, MultiplyPosition, MultiplySystemState, MultiplyTransaction } from "./types"

function cloneState(state: MultiplySystemState): MultiplySystemState {
  return {
    ...state,
    markets: { ...state.markets },
    positions: Object.fromEntries(Object.entries(state.positions).map(([id, position]) => [id, { ...position }])),
    transactions: [...state.transactions],
  }
}

function positionId(walletId: string, marketId: string) {
  return `${walletId}:${marketId}`
}

function buildPosition(params: {
  walletId: string
  marketId: string
  simulation: ReturnType<typeof simulateMultiply>
  now: number
  openedAt?: number
}): MultiplyPosition {
  return {
    id: positionId(params.walletId, params.marketId),
    walletId: params.walletId,
    marketId: params.marketId,
    collateralAmount: params.simulation.after.collateralAmount,
    collateralValueUsd: params.simulation.after.collateralValueUsd,
    debtValueUsd: params.simulation.after.debtValueUsd,
    multiplier: params.simulation.after.multiplier,
    ltv: params.simulation.after.ltv,
    healthFactor: params.simulation.after.healthFactor,
    liquidationPrice: params.simulation.after.liquidationPrice,
    netApy: params.simulation.economics.netApy,
    openedAt: params.openedAt ?? params.now,
    lastUpdatedAt: params.now,
  }
}

export function applyMultiplyAction(state: MultiplySystemState, action: MultiplyAction): MultiplySystemState {
  const next = cloneState(state)
  const at = action.at ?? state.now

  if (action.type === "multiply") {
    const market = next.markets[action.marketId]
    if (!market) throw new Error(`Unknown market ${action.marketId}`)

    const existing = next.positions[positionId(action.walletId, action.marketId)] ?? null
    const simulation = simulateMultiply({
      market,
      collateralAmount: action.collateralAmount,
      selectedMultiplier: action.selectedMultiplier,
      existingPosition: existing,
    })

    if (!simulation.validation.allowed) {
      throw new Error(simulation.validation.errors[0] ?? "Multiply action blocked")
    }

    const position = buildPosition({
      walletId: action.walletId,
      marketId: action.marketId,
      simulation,
      now: at,
      openedAt: existing?.openedAt,
    })

    next.positions[position.id] = position
    next.transactions.push({
      id: `tx-${next.transactions.length + 1}`,
      walletId: action.walletId,
      marketId: action.marketId,
      kind: "multiply",
      collateralAmountUsd: simulation.after.collateralValueUsd,
      debtDeltaUsd: simulation.after.debtValueUsd - simulation.before.debtValueUsd,
      multiplierBefore: simulation.before.multiplier,
      multiplierAfter: simulation.after.multiplier,
      at,
    } satisfies MultiplyTransaction)

    return next
  }

  const position = next.positions[action.positionId]
  if (!position) throw new Error(`Unknown position ${action.positionId}`)

  const market = next.markets[position.marketId]
  if (!market) throw new Error(`Unknown market ${position.marketId}`)

  const simulation = simulateDeleverage({
    market,
    position,
    targetMultiplier: action.targetMultiplier,
  })

  if (!simulation.validation.allowed) {
    throw new Error(simulation.validation.errors[0] ?? "Deleverage action blocked")
  }

  const updated: MultiplyPosition = {
    ...position,
    collateralAmount: simulation.after.collateralValueUsd / market.collateralAsset.priceUsd,
    collateralValueUsd: simulation.after.collateralValueUsd,
    debtValueUsd: simulation.after.debtValueUsd,
    multiplier: simulation.after.multiplier,
    ltv: simulation.after.ltv,
    healthFactor: simulation.after.healthFactor,
    liquidationPrice: simulation.after.liquidationPrice,
    netApy: simulation.economics.netApy,
    lastUpdatedAt: at,
  }

  next.positions[position.id] = updated
  next.transactions.push({
    id: `tx-${next.transactions.length + 1}`,
    walletId: action.walletId,
    marketId: position.marketId,
    kind: "deleverage",
    collateralAmountUsd: simulation.after.collateralValueUsd,
    debtDeltaUsd: simulation.after.debtValueUsd - simulation.before.debtValueUsd,
    multiplierBefore: simulation.before.multiplier,
    multiplierAfter: simulation.after.multiplier,
    at,
  })

  return next
}
