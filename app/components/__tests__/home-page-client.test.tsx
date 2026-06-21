import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HomePageClient } from "@/app/components/home-page-client"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowCollateralPools } from "@/app/lib/borrow-system/selectors"

const walletId = "demo-wallet"
let state = buildMockBorrowSystemState(walletId)

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock("@/app/components/home-workspace-primitives", () => ({
  PairVisual: () => <div />,
  TokenBubble: () => <div />,
}))

vi.mock("@/app/components/home/pool-picker-dialog", () => ({
  PoolPickerDialog: () => null,
}))

vi.mock("@/app/components/home/token-picker-dialog", () => ({
  TokenPickerDialog: () => null,
}))

vi.mock("@/app/components/action-page/embedded-action-page", () => ({
  EmbeddedActionPage: ({ kind }: { kind: string }) => <div data-testid={`embedded-${kind}`} />,
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
    state = buildMockBorrowSystemState(walletId)
  })

  it("renders inline Avana action flows instead of routing to action pages", () => {
    render(<HomePageClient />)

    expect(screen.getByTestId("embedded-borrow")).toBeInTheDocument()
    expect(screen.queryByText(/\/actions\//)).not.toBeInTheDocument()
  })

  it("switches tabs to embedded repay, claim, and remove flows", () => {
    render(<HomePageClient />)

    fireEvent.click(screen.getByText("Repay"))
    expect(screen.getByTestId("embedded-repay")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Claim"))
    expect(screen.getByTestId("embedded-claim")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Remove"))
    expect(screen.getByTestId("embedded-remove")).toBeInTheDocument()
  })
})
