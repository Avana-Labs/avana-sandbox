import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"
import { LendActionPageClient } from "@/app/components/action-page/lend-action-page-client"
import { MultiplyActionPageClient } from "@/app/components/action-page/multiply-action-page-client"

afterEach(() => cleanup())

describe("action configure asset switching", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("lets borrow users switch assets inside configure even when opened from a deep link", async () => {
    const user = userEvent.setup()

    render(
      <AvanaSessionsProvider>
        <BorrowActionPageClient kind="borrow" initialAssetId="uni-v3-bluechip:usdc" initialAmount="100" />
      </AvanaSessionsProvider>,
    )

    const switcher = await screen.findByRole("button", { name: /change asset/i })
    await user.click(switcher)

    const options = screen.getAllByRole("option")
    expect(options.length).toBeGreaterThan(1)

    const nextOption = options.find((option) => option.getAttribute("aria-selected") !== "true")
    expect(nextOption).toBeTruthy()

    const nextSymbol = nextOption!.textContent?.trim().split(/\s+/)[0] ?? ""
    await user.click(nextOption!)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /change asset/i })).toHaveTextContent(nextSymbol)
    })
  })

  it("lets lend deposit users switch markets inside configure even when opened from a deep link", async () => {
    const user = userEvent.setup()

    render(
      <AvanaSessionsProvider>
        <LendActionPageClient kind="deposit" initialMarketId="usdc" initialAmount="10" />
      </AvanaSessionsProvider>,
    )

    const switcher = await screen.findByRole("button", { name: /change asset/i })
    await user.click(switcher)

    const ethOption = screen.getAllByRole("option", { name: /ETH/i }).find((option) => option.getAttribute("aria-selected") !== "true")
    expect(ethOption).toBeTruthy()
    await user.click(ethOption!)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /change asset/i })).toHaveTextContent("ETH")
    })
  })

  it("lets multiply users switch markets inside configure", async () => {
    const user = userEvent.setup()

    render(
      <AvanaSessionsProvider>
        <MultiplyActionPageClient kind="multiply" initialMarketId="eth-usdt" initialAmount="1" />
      </AvanaSessionsProvider>,
    )

    const switcher = await screen.findByRole("button", { name: /change asset/i })
    await user.click(switcher)

    const options = screen.getAllByRole("option")
    expect(options.length).toBeGreaterThan(1)

    const nextOption = options.find((option) => option.getAttribute("aria-selected") !== "true")
    expect(nextOption).toBeTruthy()

    const nextSymbol = nextOption!.textContent?.trim().split(/\s+/)[0] ?? ""
    await user.click(nextOption!)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /change asset/i })).toHaveTextContent(nextSymbol)
    })
  })
})
