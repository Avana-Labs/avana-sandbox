import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { applyBorrowAction } from "@/app/lib/credit-engine"
import { HomePageClient } from "@/app/components/home-page-client"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowCollateralPools } from "@/app/lib/borrow-system/selectors"

const toastSuccess = vi.fn()
const toastError = vi.fn()
const createIntent = vi.fn()
const previewTransaction = vi.fn()
const executeTransaction = vi.fn()

const walletId = "demo-wallet"
let state = buildMockBorrowSystemState(walletId)

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
    warning: vi.fn(),
  },
}))

vi.mock("@/app/lib/use-media-query", () => ({
  useMediaQuery: () => true,
}))

vi.mock("@/app/components/home-workspace-primitives", () => ({
  PairVisual: () => <div />,
  TokenBubble: () => <div />,
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/app/components/home/preview-panel", () => ({
  HomePreviewPanel: () => null,
}))

vi.mock("@/app/components/home/pool-picker-dialog", () => ({
  PoolPickerDialog: () => null,
}))

vi.mock("@/app/components/home/token-picker-dialog", () => ({
  TokenPickerDialog: () => null,
}))

vi.mock("@/app/components/home-borrow-panel", () => ({
  HomeBorrowPanel: ({
    onAmountChange,
    onSubmit,
  }: {
    onAmountChange: (value: string) => void
    onSubmit: () => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onAmountChange("250")
        onSubmit()
      }}
    >
      Review borrow
    </button>
  ),
}))

vi.mock("@/app/components/home/repay-card", () => ({
  CompactRepayCard: ({
    onAmountChange,
    onSubmit,
  }: {
    onAmountChange: (value: string) => void
    onSubmit: () => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onAmountChange("150")
        onSubmit()
      }}
    >
      Review repayment
    </button>
  ),
}))

vi.mock("@/app/components/home/remove-card", () => ({
  CompactRemoveCard: ({ onSubmit }: { onSubmit: () => void }) => (
    <button type="button" onClick={onSubmit}>
      Review removal
    </button>
  ),
}))

vi.mock("@/app/components/home/claim-card", () => ({
  CompactClaimCard: ({ onSubmit }: { onSubmit: () => void }) => (
    <button type="button" onClick={onSubmit}>
      Review claim
    </button>
  ),
}))

vi.mock("@/app/components/transaction-flow", () => ({
  TransactionFlowPanel: ({
    primaryLabel,
    onPrimary,
  }: {
    primaryLabel: string
    onPrimary: () => void
  }) => (
    <button type="button" onClick={onPrimary}>
      {primaryLabel}
    </button>
  ),
}))

vi.mock("@/app/lib/borrow-system/use-borrow-session", () => ({
  useBorrowSession: () => ({
    state,
    collateralPools: selectBorrowCollateralPools(state, walletId),
    createIntent,
    previewTransaction,
    executeTransaction,
  }),
}))

vi.mock("@/components/ui/tabs", async () => {
  const React = await import("react")
  const TabsContext = React.createContext<{ value: string; onValueChange?: (value: string) => void } | null>(null)

  return {
    Tabs: ({
      value,
      onValueChange,
      children,
    }: {
      value: string
      onValueChange?: (value: string) => void
      children: React.ReactNode
    }) => <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>,
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({
      value,
      children,
    }: {
      value: string
      children: React.ReactNode
    }) => {
      const context = React.useContext(TabsContext)
      return (
        <button type="button" onClick={() => context?.onValueChange?.(value)}>
          {children}
        </button>
      )
    },
    TabsContent: ({
      value,
      children,
    }: {
      value: string
      children: React.ReactNode
    }) => {
      const context = React.useContext(TabsContext)
      return context?.value === value ? <div>{children}</div> : null
    },
  }
})

describe("HomePageClient", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    state = buildMockBorrowSystemState(walletId)

    createIntent.mockImplementation((action) => ({ id: `intent-${action.type}`, payload: action }))
    previewTransaction.mockImplementation(async (intent) => ({ allowed: true, intent, validationErrors: [] }))
    executeTransaction.mockImplementation(async (intent) => {
      state = applyBorrowAction(state, { ...intent.payload, at: Date.now() })
      return {
        preview: { allowed: true, intent },
        receipt: {
          id: "receipt-1",
          hash: "sim_1",
          status: "success",
          actionType: intent.payload.type === "supplyCollateral" ? "deposit" : intent.payload.type === "removeCollateral" ? "withdraw" : intent.payload.type,
          simulated: true,
          timestamp: Date.now(),
        },
        result: {
          id: "receipt-1",
          hash: "sim_1",
          status: "success",
          actionType: intent.payload.type === "supplyCollateral" ? "deposit" : intent.payload.type === "removeCollateral" ? "withdraw" : intent.payload.type,
          simulated: true,
          timestamp: Date.now(),
        },
        historyItem: {
          id: "history-1",
          executedAmountUsd6: intent.payload.amountUsd6 ?? 0n,
        },
        state,
      }
    })
  })

  it("routes the borrow flow through transaction adapters", async () => {
    render(<HomePageClient />)

    fireEvent.click(screen.getByText("Review borrow"))
    fireEvent.click(screen.getByText("Borrow now"))
    fireEvent.click(screen.getByText("Approve wallet"))

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(createIntent).toHaveBeenCalledTimes(1)
    expect(previewTransaction).toHaveBeenCalledTimes(1)
    expect(executeTransaction).toHaveBeenCalledTimes(1)
  })

  it("routes the repay flow through transaction adapters", async () => {
    render(<HomePageClient />)

    fireEvent.click(screen.getByText("Repay"))
    fireEvent.click(screen.getByText("Review repayment"))
    fireEvent.click(screen.getByText("Continue"))
    fireEvent.click(screen.getByText("Approve wallet"))

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(createIntent).toHaveBeenCalledTimes(1)
    expect(previewTransaction).toHaveBeenCalledTimes(1)
    expect(executeTransaction).toHaveBeenCalledTimes(1)
  })

  it("routes the remove flow through transaction adapters", async () => {
    render(<HomePageClient />)

    fireEvent.click(screen.getByText("Remove"))
    fireEvent.click(screen.getByText("Review removal"))
    fireEvent.click(screen.getByText("Continue"))
    fireEvent.click(screen.getByText("Approve wallet"))

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(createIntent).toHaveBeenCalledTimes(1)
    expect(previewTransaction).toHaveBeenCalledTimes(1)
    expect(executeTransaction).toHaveBeenCalledTimes(1)
  })
})
