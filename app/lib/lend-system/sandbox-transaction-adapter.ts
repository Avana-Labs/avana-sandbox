import { applyLendAction, simulateDeposit, simulateWithdraw, type LendAction, type LendSystemState } from "@/app/lib/lend-engine"
import type {
  LendSandboxActionResult,
  LendTransactionAdapter,
  LendTransactionHistoryItem,
  LendTransactionIntent,
  LendTransactionPreview,
} from "./contracts"

type SandboxAdapterOptions = {
  readState: () => LendSystemState
  writeState: (state: LendSystemState) => void
  now?: () => number
  generateId?: (prefix: string) => string
}

function defaultId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function findWalletPosition(state: LendSystemState, walletId: string, marketId: string) {
  return Object.values(state.positions).find(
    (position) => position.walletId === walletId && position.marketId === marketId && position.status === "active",
  )
}

function toPreview(state: LendSystemState, action: LendAction, intent: LendTransactionIntent): LendTransactionPreview {
  if (action.type === "deposit") {
    const market = state.markets[action.marketId]
    if (!market) throw new Error(`Unknown market ${action.marketId}`)
    const existing = findWalletPosition(state, action.walletId, action.marketId)
    const simulation = simulateDeposit({
      market,
      position: existing,
      depositAmount: action.depositAmount,
      walletBalance: action.walletBalance,
      now: state.now,
    })

    return {
      intent,
      allowed: simulation.validation.allowed,
      warnings: simulation.validation.warnings,
      validationErrors: simulation.validation.errors,
      before: {
        suppliedAmount: simulation.before.suppliedAmount,
        suppliedValueUsd: simulation.before.suppliedValueUsd,
        principalAmount: simulation.before.principalAmount,
        interestEarned: simulation.before.interestEarned,
        currentApy: simulation.market.totalApy,
      },
      after: {
        suppliedAmount: simulation.after.suppliedAmount,
        suppliedValueUsd: simulation.after.suppliedValueUsd,
        principalAmount: simulation.after.principalAmount,
        interestEarned: simulation.after.interestEarned,
        currentApy: simulation.market.totalApy,
      },
    }
  }

  const position = state.positions[action.positionId]
  if (!position) throw new Error(`Unknown position ${action.positionId}`)
  const market = state.markets[action.marketId]
  if (!market) throw new Error(`Unknown market ${action.marketId}`)
  const simulation = simulateWithdraw({
    market,
    position,
    withdrawAmount: action.withdrawAmount,
    now: state.now,
  })

  return {
    intent,
    allowed: simulation.validation.allowed,
    warnings: simulation.validation.warnings,
    validationErrors: simulation.validation.errors,
    before: {
      suppliedAmount: simulation.before.suppliedAmount,
      suppliedValueUsd: simulation.before.suppliedValueUsd,
      principalAmount: simulation.before.principalAmount,
      interestEarned: simulation.before.interestEarned,
      currentApy: simulation.market.totalApy,
    },
    after: {
      suppliedAmount: simulation.after.suppliedAmount,
      suppliedValueUsd: simulation.after.suppliedValueUsd,
      principalAmount: simulation.after.principalAmount,
      interestEarned: simulation.after.interestEarned,
      currentApy: simulation.market.totalApy,
    },
    maxWithdrawable: simulation.withdrawal.maxWithdrawable,
  }
}

export class SandboxLendTransactionAdapter implements LendTransactionAdapter {
  readonly mode = "sandbox" as const
  private readonly readStateImpl: SandboxAdapterOptions["readState"]
  private readonly writeStateImpl: SandboxAdapterOptions["writeState"]
  private readonly now: () => number
  private readonly generateId: (prefix: string) => string
  private readonly previewCache = new Map<string, LendTransactionPreview>()

  constructor(options: SandboxAdapterOptions) {
    this.readStateImpl = options.readState
    this.writeStateImpl = options.writeState
    this.now = options.now ?? Date.now
    this.generateId = options.generateId ?? defaultId
  }

  createIntent(action: LendAction): LendTransactionIntent {
    return {
      id: this.generateId("intent"),
      actionType: action.type,
      walletId: action.walletId,
      marketId: action.marketId,
      positionId: action.type === "withdraw" ? action.positionId : undefined,
      requestedAt: this.now(),
      simulated: true,
      payload: action,
    }
  }

  async previewTransaction(intent: LendTransactionIntent): Promise<LendTransactionPreview> {
    const cached = this.previewCache.get(intent.id)
    if (cached) return cached
    const action = intent.payload
    if (!action) throw new Error("Missing lend action payload")
    const preview = toPreview(this.readStateImpl(), action, intent)
    this.previewCache.set(intent.id, preview)
    return preview
  }

  async executeTransaction(intent: LendTransactionIntent): Promise<LendSandboxActionResult> {
    const preview = await this.previewTransaction(intent)
    const action = intent.payload
    if (!action || !preview.allowed) {
      throw new Error(preview.validationErrors[0] ?? "Lend transaction is not allowed")
    }

    const state = this.readStateImpl()
    const positionId =
      action.type === "withdraw"
        ? action.positionId
        : findWalletPosition(state, action.walletId, action.marketId)?.positionId ?? `${action.walletId}:${action.marketId}`
    const transactionId = this.generateId("tx")
    const nextState = applyLendAction(state, action, { positionId, transactionId })
    this.writeStateImpl(nextState)

    const receipt = {
      id: transactionId,
      hash: `sim_lend_${transactionId}`,
      status: "success" as const,
      actionType: action.type,
      simulated: true as const,
      timestamp: this.now(),
    }

    const historyItem: LendTransactionHistoryItem = {
      id: transactionId,
      intentId: intent.id,
      walletId: action.walletId,
      marketId: action.marketId,
      positionId,
      kind: action.type,
      status: "success",
      asset: state.markets[action.marketId]?.asset.symbol ?? "",
      amount: action.type === "deposit" ? action.depositAmount : action.withdrawAmount,
      simulated: true,
      timestamp: receipt.timestamp,
      hash: receipt.hash,
    }

    return { preview, receipt, historyItem, state: nextState }
  }
}
