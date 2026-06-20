import {
  applyMultiplyAction,
  simulateDeleverage,
  simulateMultiply,
  type MultiplyAction,
  type MultiplySystemState,
} from "@/app/lib/multiply-engine"
import type {
  MultiplySandboxActionResult,
  MultiplyTransactionAdapter,
  MultiplyTransactionHistoryItem,
  MultiplyTransactionIntent,
  MultiplyTransactionPreview,
} from "./contracts"

type SandboxAdapterOptions = {
  readState: () => MultiplySystemState
  writeState: (state: MultiplySystemState) => void
  now?: () => number
  generateId?: (prefix: string) => string
}

function defaultId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function toPreview(state: MultiplySystemState, action: MultiplyAction, intent: MultiplyTransactionIntent): MultiplyTransactionPreview {
  if (action.type === "multiply") {
    const market = state.markets[action.marketId]
    if (!market) throw new Error(`Unknown market ${action.marketId}`)
    const existing = Object.values(state.positions).find(
      (position) => position.walletId === action.walletId && position.marketId === action.marketId,
    )
    const simulation = simulateMultiply({
      market,
      collateralAmount: action.collateralAmount,
      selectedMultiplier: action.selectedMultiplier,
      existingPosition: existing,
    })

    return {
      intent,
      allowed: simulation.validation.allowed,
      warnings: simulation.validation.warnings,
      validationErrors: simulation.validation.errors,
      riskLabel: simulation.validation.allowed ? (simulation.validation.warnings.length ? "warning" : "safe") : "danger",
      before: {
        collateralValueUsd: simulation.before.collateralValueUsd,
        debtValueUsd: simulation.before.debtValueUsd,
        multiplier: simulation.before.multiplier,
        ltv: simulation.before.ltv,
        healthFactor: simulation.before.healthFactor,
        netApy: simulation.economics.netApy,
      },
      after: {
        collateralValueUsd: simulation.after.collateralValueUsd,
        debtValueUsd: simulation.after.debtValueUsd,
        multiplier: simulation.after.multiplier,
        ltv: simulation.after.ltv,
        healthFactor: simulation.after.healthFactor,
        netApy: simulation.economics.netApy,
      },
      simulationSummary: {
        liquidationPrice: simulation.after.liquidationPrice,
        priceImpactPct: simulation.economics.priceImpactPct,
        maxLeverageApy: simulation.economics.maxLeverageApy,
      },
    }
  }

  const position = state.positions[action.positionId]
  if (!position) throw new Error(`Unknown position ${action.positionId}`)
  const market = state.markets[position.marketId]
  if (!market) throw new Error(`Unknown market ${position.marketId}`)
  const simulation = simulateDeleverage({ market, position, targetMultiplier: action.targetMultiplier })

  return {
    intent,
    allowed: simulation.validation.allowed,
    warnings: simulation.validation.warnings,
    validationErrors: simulation.validation.errors,
    riskLabel: simulation.validation.allowed ? (simulation.validation.warnings.length ? "warning" : "safe") : "danger",
    before: {
      collateralValueUsd: simulation.before.collateralValueUsd,
      debtValueUsd: simulation.before.debtValueUsd,
      multiplier: simulation.before.multiplier,
      ltv: simulation.before.ltv,
      healthFactor: simulation.before.healthFactor,
      netApy: position.netApy,
    },
    after: {
      collateralValueUsd: simulation.after.collateralValueUsd,
      debtValueUsd: simulation.after.debtValueUsd,
      multiplier: simulation.after.multiplier,
      ltv: simulation.after.ltv,
      healthFactor: simulation.after.healthFactor,
      netApy: simulation.economics.netApy,
    },
    simulationSummary: {
      liquidationPrice: simulation.after.liquidationPrice,
      priceImpactPct: simulation.economics.priceImpactPct,
    },
  }
}

export class SandboxMultiplyTransactionAdapter implements MultiplyTransactionAdapter {
  readonly mode = "sandbox" as const
  private readonly readStateImpl: SandboxAdapterOptions["readState"]
  private readonly writeStateImpl: SandboxAdapterOptions["writeState"]
  private readonly now: () => number
  private readonly generateId: (prefix: string) => string
  private readonly previewCache = new Map<string, MultiplyTransactionPreview>()

  constructor(options: SandboxAdapterOptions) {
    this.readStateImpl = options.readState
    this.writeStateImpl = options.writeState
    this.now = options.now ?? Date.now
    this.generateId = options.generateId ?? defaultId
  }

  createIntent(action: MultiplyAction): MultiplyTransactionIntent {
    return {
      id: this.generateId("intent"),
      actionType: action.type,
      walletId: action.walletId,
      marketId: action.type === "multiply" ? action.marketId : undefined,
      positionId: action.type === "deleverage" ? action.positionId : undefined,
      requestedAt: this.now(),
      simulated: true,
      payload: action,
    }
  }

  async previewTransaction(intent: MultiplyTransactionIntent): Promise<MultiplyTransactionPreview> {
    const cached = this.previewCache.get(intent.id)
    if (cached) return cached

    const action = intent.payload
    if (!action) throw new Error("Multiply transaction intent is missing its action payload")

    const preview = toPreview(this.readStateImpl(), action, intent)
    this.previewCache.set(intent.id, preview)
    return preview
  }

  async executeTransaction(intent: MultiplyTransactionIntent): Promise<MultiplySandboxActionResult> {
    const preview = await this.previewTransaction(intent)
    const action = intent.payload
    if (!action) throw new Error("Multiply transaction intent is missing its action payload")

    if (!preview.allowed) {
      const receipt = {
        id: this.generateId("receipt"),
        hash: `0xsim${Math.random().toString(16).slice(2, 10)}`,
        status: "failed" as const,
        actionType: intent.actionType,
        simulated: true,
        timestamp: this.now(),
        error: preview.validationErrors[0] ?? "Action blocked",
      }
      const historyItem: MultiplyTransactionHistoryItem = {
        id: receipt.id,
        intentId: intent.id,
        walletId: intent.walletId,
        marketId: intent.marketId,
        positionId: intent.positionId,
        kind: intent.actionType,
        status: "failed",
        amountUsd: action.type === "multiply" ? Math.max(0, preview.after.collateralValueUsd - preview.before.collateralValueUsd) : 0,
        multiplierBefore: preview.before.multiplier,
        multiplierAfter: preview.after.multiplier,
        simulated: true,
        timestamp: receipt.timestamp,
        hash: receipt.hash,
      }
      return {
        preview,
        receipt,
        historyItem,
        state: this.readStateImpl(),
      }
    }

    const nextState = applyMultiplyAction(this.readStateImpl(), { ...action, at: this.now() })
    this.writeStateImpl(nextState)

    const receipt = {
      id: this.generateId("receipt"),
      hash: `0xsim${Math.random().toString(16).slice(2, 10)}`,
      status: "success" as const,
      actionType: intent.actionType,
      simulated: true,
      timestamp: this.now(),
    }

    const historyItem: MultiplyTransactionHistoryItem = {
      id: receipt.id,
      intentId: intent.id,
      walletId: intent.walletId,
      marketId: intent.marketId ?? (action.type === "deleverage" ? nextState.positions[action.positionId]?.marketId : action.marketId),
      positionId: intent.positionId,
      kind: intent.actionType,
      status: "success",
      amountUsd:
        action.type === "multiply"
          ? Math.max(0, preview.after.collateralValueUsd - preview.before.collateralValueUsd)
          : Math.max(0, preview.before.collateralValueUsd - preview.after.collateralValueUsd),
      multiplierBefore: preview.before.multiplier,
      multiplierAfter: preview.after.multiplier,
      simulated: true,
      timestamp: receipt.timestamp,
      hash: receipt.hash,
    }

    return {
      preview,
      receipt,
      historyItem,
      state: nextState,
    }
  }
}
