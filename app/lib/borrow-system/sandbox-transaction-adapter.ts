import {
  applyBorrowAction,
  simulateBorrow,
  simulateClaim,
  simulateDeposit,
  simulateLiquidation,
  simulateRepay,
  simulateWithdraw,
  type BorrowAction,
  type BorrowSystemState,
} from "@/app/lib/credit-engine"
import { resolveBorrowAssetId } from "@/app/lib/action-system/resolve-borrow-context"
import type { SandboxActionResult, TransactionActionType, TransactionAdapter, TransactionHistoryItem, TransactionIntent, TransactionPreview } from "./contracts"

type SandboxAdapterOptions = {
  readState: () => BorrowSystemState
  writeState: (state: BorrowSystemState) => void
  persistResult?: (result: SandboxActionResult) => Promise<{
    id: string
    hash: string
    status: "success" | "failed" | "pending"
    simulated: boolean
    timestamp: number
  }>
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
    case "claim":
      return "claim"
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

function executedAmountFromPreview(action: BorrowAction, preview: TransactionPreview) {
  if (action.type === "removeCollateral") {
    const delta = preview.before.collateralValueUsd6 - preview.after.collateralValueUsd6
    return delta > 0n ? delta : 0n
  }
  return toIntentAmount(action)
}

function normalizeBorrowAction(state: BorrowSystemState, action: BorrowAction): BorrowAction {
  if (action.type !== "borrow") return action

  const marketId = action.marketId
  const resolvedAssetId = resolveBorrowAssetId(state, action.assetId, marketId)
  if (!resolvedAssetId || resolvedAssetId === action.assetId) return action

  return {
    ...action,
    assetId: resolvedAssetId,
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
            : action.type === "claim"
              ? simulateClaim(state, action)
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
  private readonly persistResult?: SandboxAdapterOptions["persistResult"]
  private readonly now: () => number
  private readonly generateId: (prefix: string) => string
  private readonly seed: BorrowSystemState
  private readonly previewCache = new Map<string, TransactionPreview>()

  constructor(options: SandboxAdapterOptions) {
    this.readStateImpl = options.readState
    this.writeStateImpl = options.writeState
    this.persistResult = options.persistResult
    this.now = options.now ?? Date.now
    this.generateId = options.generateId ?? defaultId
    this.seed = options.readState()
  }

  createIntent(action: BorrowAction): TransactionIntent {
    const normalized = normalizeBorrowAction(this.readStateImpl(), action)
    return {
      id: this.generateId("intent"),
      actionType: normalizeActionType(normalized),
      walletId: normalized.walletId,
      marketId: "marketId" in normalized ? normalized.marketId : undefined,
      assetId: "assetId" in normalized ? normalized.assetId : undefined,
      positionId: "positionId" in normalized ? normalized.positionId : undefined,
      debtPositionId: "debtPositionId" in normalized ? normalized.debtPositionId : undefined,
      amountUsd6: toIntentAmount(normalized),
      requestedAt: this.now(),
      simulated: true,
      payload: normalized,
    }
  }

  async previewTransaction(intent: TransactionIntent): Promise<TransactionPreview> {
    const cached = this.previewCache.get(intent.id)
    if (cached) {
      return cached
    }

    const action = intent.payload
    if (!action) {
      throw new Error("Sandbox transaction intent is missing its borrow action payload")
    }
    const preview = toPreview(this.readStateImpl(), action, intent)
    this.previewCache.set(intent.id, preview)
    return preview
  }

  async executeTransaction(intent: TransactionIntent): Promise<SandboxActionResult> {
    const action = intent.payload
    if (!action) {
      throw new Error("Sandbox transaction intent is missing its borrow action payload")
    }

    const current = this.readStateImpl()
    const preview = await this.previewTransaction(intent)
    const timestamp = this.now()

    if (action.type === "liquidate") {
      const receipt = {
        id: this.generateId("receipt"),
        hash: this.generateId("sim"),
        status: "failed" as const,
        actionType: intent.actionType,
        simulated: true,
        timestamp,
        error: "Liquidation is preview-only in sandbox mode",
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
    const localReceipt = {
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
        executedAmountUsd6: executedAmountFromPreview(action, preview),
        simulated: true,
        timestamp,
        hash: localReceipt.hash,
      }

    const localResult: SandboxActionResult = {
      preview,
      receipt: localReceipt,
      result: localReceipt,
      historyItem,
      state: nextState,
    }
    const persisted = this.persistResult ? await this.persistResult(localResult) : localReceipt
    const receipt = { ...localReceipt, ...persisted }
    const persistedResult = {
      ...localResult,
      receipt,
      result: receipt,
      historyItem: {
        ...historyItem,
        id: persisted.id,
        hash: persisted.hash,
        status: persisted.status,
        timestamp: persisted.timestamp,
      },
    }
    this.writeStateImpl(nextState)
    return persistedResult
  }

  resetSandboxState() {
    this.writeStateImpl(this.seed)
  }
}
