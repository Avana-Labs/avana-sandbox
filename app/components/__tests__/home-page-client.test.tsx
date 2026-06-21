import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HomePageClient } from "@/app/components/home-page-client"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowCollateralPools } from "@/app/lib/borrow-system/selectors"

const push = vi.fn()
const toastWarning = vi.fn()

const walletId = "demo-wallet"
let state = buildMockBorrowSystemState(walletId)

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: (...args: unknown[]) => toastWarning(...args),
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/app/components/home-workspace-primitives", () => ({
  PairVisual: () => <div />,
  TokenBubble: () => <div />,
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

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  useAvanaSessions: () => ({
    walletId,
    borrow: {
      state,
      collateralPools: selectBorrowCollateralPools(state, walletId),
    },
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
    vi.clearAllMocks()
    state = buildMockBorrowSystemState(walletId)
  })

  it("routes borrow review to the shared action page", () => {
    render(<HomePageClient />)
    fireEvent.click(screen.getByText("Review borrow"))
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/actions/borrow/borrow"))
  })

  it("routes repay review to the shared action page", () => {
    render(<HomePageClient />)
    fireEvent.click(screen.getByText("Repay"))
    fireEvent.click(screen.getByText("Review repayment"))
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/actions/borrow/repay"))
  })

  it("routes remove review to the shared action page", () => {
    render(<HomePageClient />)
    fireEvent.click(screen.getByText("Remove"))
    fireEvent.click(screen.getByText("Review removal"))
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/actions/borrow/remove"))
  })
})
