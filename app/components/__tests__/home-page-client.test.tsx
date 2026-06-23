import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HomePageClient } from "@/app/components/home-page-client"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowCollateralPools } from "@/app/lib/borrow-system/selectors"

const walletId = "demo-wallet"
let state = buildMockBorrowSystemState(walletId)

vi.mock("@/app/components/action-page/borrow-action-page-client", () => ({
  BorrowActionPageClient: ({ kind, embedded }: { kind: string; embedded?: boolean }) => (
    <div data-testid={`embedded-borrow-action-${kind}`} data-embedded={embedded ? "true" : "false"} />
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
    state = buildMockBorrowSystemState(walletId)
  })

  it("embeds borrow actions directly in each home tab", () => {
    render(<HomePageClient />)

    expect(screen.getByTestId("embedded-borrow-action-borrow")).toHaveAttribute("data-embedded", "true")
  })

  it("switches tabs to embedded repay, claim, and remove actions", () => {
    render(<HomePageClient />)

    fireEvent.click(screen.getAllByRole("button", { name: "Repay" })[0]!)
    expect(screen.getByTestId("embedded-borrow-action-repay")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: "Claim" })[0]!)
    expect(screen.getByTestId("embedded-borrow-action-claim")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!)
    expect(screen.getByTestId("embedded-borrow-action-remove")).toBeInTheDocument()
  })
})
