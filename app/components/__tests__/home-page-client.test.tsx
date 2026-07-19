import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HomePageClient } from "@/app/components/home-page-client"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectAllAvailableCollateralPools, selectBorrowCollateralPools } from "@/app/lib/borrow-system/selectors"

const walletId = "demo-wallet"
let state = buildMockBorrowSystemState(walletId)

vi.mock("@/app/components/action-page/borrow-action-page-client", () => ({
  BorrowActionPageClient: ({
    kind,
    embedded,
    layout,
    initialAmount,
  }: {
    kind: string
    embedded?: boolean
    layout?: string
    initialAmount?: string
  }) => (
    <div
      data-testid={`embedded-borrow-action-${kind}`}
      data-embedded={embedded ? "true" : "false"}
      data-layout={layout ?? "default"}
      data-initial-amount={initialAmount ?? ""}
    />
  ),
}))

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  AvanaSessionsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useBorrowSessionContext: () => ({
    state,
    collateralPools: selectBorrowCollateralPools(state, walletId),
    availableCollateralPools: selectAllAvailableCollateralPools(state, walletId),
  }),
}))

vi.mock("@/app/lib/siwe/use-siwe-auth", () => ({
  useSiweAuth: () => ({ isSignedIn: false, address: null }),
}))

describe("HomePageClient", () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    state = buildMockBorrowSystemState(walletId)
  })

  it("embeds borrow actions in the home workspace card", async () => {
    render(<HomePageClient />)

    expect(screen.getByTestId("home-workspace-card")).toBeInTheDocument()
    const borrowAction = await screen.findByTestId("embedded-borrow-action-borrow")
    expect(borrowAction).toHaveAttribute("data-embedded", "true")
    expect(borrowAction).toHaveAttribute("data-layout", "home")
  })

  it("switches tabs to embedded repay, claim, and remove actions", async () => {
    render(<HomePageClient />)
    const card = screen.getByTestId("home-workspace-card")

    fireEvent.click(within(card).getByRole("tab", { name: "Repay" }))
    expect(await screen.findByTestId("embedded-borrow-action-repay")).toBeInTheDocument()

    fireEvent.click(within(card).getByRole("tab", { name: "Claim" }))
    expect(await screen.findByTestId("embedded-borrow-action-claim")).toBeInTheDocument()

    fireEvent.click(within(card).getByRole("tab", { name: "Remove" }))
    expect(await screen.findByTestId("embedded-borrow-action-remove")).toHaveAttribute("data-initial-amount", "")
  })
})
