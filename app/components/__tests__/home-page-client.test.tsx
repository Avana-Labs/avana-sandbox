import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HomePageClient } from "@/app/components/home-page-client"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowCollateralPools } from "@/app/lib/borrow-system/selectors"

const walletId = "demo-wallet"
let state = buildMockBorrowSystemState(walletId)

vi.mock("@/app/components/action-page/borrow-action-page-client", () => ({
  BorrowActionPageClient: ({
    kind,
    embedded,
    layout,
  }: {
    kind: string
    embedded?: boolean
    layout?: string
  }) => (
    <div
      data-testid={`embedded-borrow-action-${kind}`}
      data-embedded={embedded ? "true" : "false"}
      data-layout={layout ?? "default"}
    />
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

describe("HomePageClient", () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    state = buildMockBorrowSystemState(walletId)
  })

  it("embeds borrow actions in the home workspace card", () => {
    render(<HomePageClient />)

    expect(screen.getByTestId("home-workspace-card")).toBeInTheDocument()
    expect(screen.getByTestId("embedded-borrow-action-borrow")).toHaveAttribute("data-embedded", "true")
    expect(screen.getByTestId("embedded-borrow-action-borrow")).toHaveAttribute("data-layout", "home")
  })

  it("switches tabs to embedded repay, claim, and remove actions", () => {
    render(<HomePageClient />)
    const card = screen.getByTestId("home-workspace-card")

    fireEvent.click(within(card).getByRole("tab", { name: "Repay" }))
    expect(screen.getByTestId("embedded-borrow-action-repay")).toBeInTheDocument()

    fireEvent.click(within(card).getByRole("tab", { name: "Claim" }))
    expect(screen.getByTestId("embedded-borrow-action-claim")).toBeInTheDocument()

    fireEvent.click(within(card).getByRole("tab", { name: "Remove" }))
    expect(screen.getByTestId("embedded-borrow-action-remove")).toBeInTheDocument()
  })
})
