import {
  applyBorrowAction,
  simulateBorrow,
  simulateDeposit,
  simulateLiquidation,
  simulateRepay,
  simulateWithdraw,
  type BorrowAction,
  type BorrowSystemState,
} from "@/app/lib/credit-engine"
import type { SandboxActionResult, TransactionActionType, TransactionAdapter, TransactionHistoryItem, TransactionIntent, TransactionPreview } from "./contracts"

type SandboxAdapterOptions = {
  readState: () => BorrowSystemState
  writeState: (state: BorrowSystemState) => void
  now?: () => number
  generateId?: (prefix: string) => string
}

function defaultId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeActionType(action: BorrowAction): TransactionActionType {
  switch (action.type) {
    case "supplyCollateral":
      return "deposit"
    case "removeCollateral":
      return "withdraw"
    case "liquidate":
      return "liquidate"
    case "repay":
      return "repay"
    case "borrow":
      return "borrow"
  }
}

function toIntentAmount(action: BorrowAction) {
  switch (action.type) {
    case "removeCollateral":
      return action.amountUsd6 ?? 0n
    case "liquidate":
      return action.repayAmountUsd6
    default:
      return action.amountUsd6
  }
}

function toPreview(state: BorrowSystemState, action: BorrowAction, intent: TransactionIntent): TransactionPreview {
  const simulation =
    action.type === "supplyCollateral"
      ? simulateDeposit(state, action)
      : action.type === "borrow"
        ? simulateBorrow(state, action)
        : action.type === "repay"
          ? simulateRepay(state, action)
          : action.type === "removeCollateral"
            ? simulateWithdraw(state, action)
            : simulateLiquidation(state, action)

  return {
    intent,
    allowed: simulation.allowed,
    warnings: simulation.warnings,
    validationErrors: simulation.validationErrors,
    riskLabel: simulation.riskLabel,
    before: simulation.before.metrics,
    after: simulation.after.metrics,
  }
}

export class SandboxTransactionAdapter implements TransactionAdapter {
  readonly mode = "sandbox" as const
  private readonly readStateImpl: SandboxAdapterOptions["readState"]
  private readonly writeStateImpl: SandboxAdapterOptions["writeState"]
  private readonly now: () => number
  private readonly generateId: (prefix: string) => string
  private readonly seed: BorrowSystemState

  constructor(options: SandboxAdapterOptions) {
    this.readStateImpl = options.readState
    this.writeStateImpl = options.writeState
    this.now = options.now ?? Date.now
    this.generateId = options.generateId ?? defaultId
    this.seed = options.readState()
  }

  createIntent(action: BorrowAction): TransactionIntent {
    return {
      id: this.generateId("intent"),
      actionType: normalizeActionType(action),
      walletId: action.walletId,
      marketId: "marketId" in action ? action.marketId : undefined,
      assetId: "assetId" in action ? action.assetId : undefined,
      positionId: "positionId" in action ? action.positionId : undefined,
      debtPositionId: "debtPositionId" in action ? action.debtPositionId : undefined,
      amountUsd6: toIntentAmount(action),
      requestedAt: this.now(),
      simulated: true,
      payload: action,
    }
  }

  async previewTransaction(intent: TransactionIntent): Promise<TransactionPreview> {
    const action = intent.payload
    if (!action) {
      throw new Error("Sandbox transaction intent is missing its borrow action payload")
    }
    return toPreview(this.readStateImpl(), action, intent)
  }

  async executeTransaction(intent: TransactionIntent): Promise<SandboxActionResult> {
    const action = intent.payload
    if (!action) {
      throw new Error("Sandbox transaction intent is missing its borrow action payload")
    }

    const current = this.readStateImpl()
    const preview = await this.previewTransaction(intent)
    const timestamp = this.now()

    if (!preview.allowed) {
      const receipt = {
        id: this.generateId("receipt"),
        hash: this.generateId("sim"),
        status: "failed" as const,
        actionType: intent.actionType,
        simulated: true,
        timestamp,
        error: preview.validationErrors[0],
      }
      const historyItem: TransactionHistoryItem = {
        id: this.generateId("history"),
        intentId: intent.id,
        walletId: intent.walletId,
        marketId: intent.marketId,
        assetId: intent.assetId,
        kind: intent.actionType,
        status: "failed",
        requestedAmountUsd6: intent.amountUsd6,
        executedAmountUsd6: 0n,
        simulated: true,
        timestamp,
        hash: receipt.hash,
      }

      return {
        preview,
        receipt,
        result: receipt,
        historyItem,
        state: current,
      }
    }

    const nextState = applyBorrowAction(current, {
      ...action,
      at: timestamp,
    } as BorrowAction)
    this.writeStateImpl(nextState)

    const receipt = {
      id: this.generateId("receipt"),
      hash: this.generateId("sim"),
      status: "success" as const,
      actionType: intent.actionType,
      simulated: true,
      timestamp,
    }
    const historyItem: TransactionHistoryItem = {
      id: this.generateId("history"),
      intentId: intent.id,
      walletId: intent.walletId,
      marketId: intent.marketId,
      assetId: intent.assetId,
      kind: intent.actionType,
      status: "success",
      requestedAmountUsd6: intent.amountUsd6,
      executedAmountUsd6: intent.amountUsd6,
      simulated: true,
      timestamp,
      hash: receipt.hash,
    }

    return {
      preview,
      receipt,
      result: receipt,
      historyItem,
      state: nextState,
    }
  }

  resetSandboxState() {
    this.writeStateImpl(this.seed)
  }
}
