import { fireEvent, render, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AMOUNT_SIGN_BY_KIND, RecentActivity } from "@/app/dashboard/recent-activity"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

function makeRow(overrides: Partial<PortfolioActivityRow> & { id: string; txHash: string }): PortfolioActivityRow {
  return {
    at: "2026-06-19T12:00:00.000Z",
    product: "lend",
    kind: "supply",
    status: "confirmed",
    amountUsd: 1000,
    primaryLabel: "Simulated deposit",
    secondaryLabel: "0.4 ETH",
    ...overrides,
  }
}

function hrefFor(container: HTMLElement, txHash: string) {
  const links = Array.from(container.querySelectorAll("a")) as HTMLAnchorElement[]
  return links.find((link) => link.getAttribute("href")?.includes(txHash.slice(0, 6)))
}

describe("RecentActivity txn links", () => {
  it("routes simulated sandbox hashes to the in-app receipt page, not Etherscan", () => {
    const { container } = render(
      <DisplayPreferencesProvider>
        <RecentActivity
          rows={[
            makeRow({ id: "sim-1", txHash: "sim_lend_abc123" }),
            makeRow({ id: "sim-2", txHash: "sim-def456" }),
            makeRow({ id: "sim-3", txHash: "0xsim9f8e7d" }),
          ]}
        />
      </DisplayPreferencesProvider>,
    )
    const view = within(container)
    const links = Array.from(container.querySelectorAll("a")) as HTMLAnchorElement[]

    // No dead Etherscan links for simulated hashes. Check the resolved host exactly — a
    // substring match on the full URL would also accept an unrelated host such as
    // "etherscan.io.evil.com" or a path/query that merely contains the string.
    const hostOf = (link: HTMLAnchorElement) => {
      try {
        return new URL(link.href).hostname
      } catch {
        return ""
      }
    }
    expect(links.some((link) => hostOf(link) === "etherscan.io")).toBe(false)
    // Each simulated hash points to the sandbox receipt page.
    expect(hrefFor(container, "sim_lend_abc123")?.getAttribute("href")).toBe("/sandbox/transactions/sim_lend_abc123")
    expect(hrefFor(container, "sim-def456")?.getAttribute("href")).toBe("/sandbox/transactions/sim-def456")
    // A 0xsim… multiply hash is not a real 66-char hash → sandbox page.
    expect(hrefFor(container, "0xsim9f8e7d")?.getAttribute("href")).toBe("/sandbox/transactions/0xsim9f8e7d")
    // Internal links do not open in a new tab.
    expect(view.queryByText(/etherscan/i)).not.toBeInTheDocument()
  })

  it("keeps a canonical on-chain hash pointing at Etherscan", () => {
    const realHash = `0x${"a".repeat(64)}`
    const { container } = render(
      <DisplayPreferencesProvider>
        <RecentActivity rows={[makeRow({ id: "real-1", txHash: realHash })]} />
      </DisplayPreferencesProvider>,
    )
    const link = hrefFor(container, realHash)
    expect(link?.getAttribute("href")).toBe(`https://etherscan.io/tx/${realHash}`)
    expect(link?.getAttribute("target")).toBe("_blank")
  })
})

describe("RecentActivity whole-row navigation", () => {
  beforeEach(() => {
    push.mockClear()
  })

  it("opens the in-app receipt when a simulated row is clicked anywhere", () => {
    const { container } = render(
      <DisplayPreferencesProvider>
        <RecentActivity rows={[makeRow({ id: "sim-1", txHash: "sim-abc123", primaryLabel: "Simulated deposit" })]} />
      </DisplayPreferencesProvider>,
    )
    // Each row renders on both the mobile card and desktop table; both are links.
    const rows = Array.from(container.querySelectorAll('[role="link"]')) as HTMLElement[]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.getAttribute("aria-label")).toContain("Simulated deposit")
      expect(row.getAttribute("tabindex")).toBe("0")
    }
    fireEvent.click(rows[0])
    expect(push).toHaveBeenCalledWith("/sandbox/transactions/sim-abc123")
  })

  it("activates the row via the keyboard (Enter)", () => {
    const { container } = render(
      <DisplayPreferencesProvider>
        <RecentActivity rows={[makeRow({ id: "sim-2", txHash: "sim-key456" })]} />
      </DisplayPreferencesProvider>,
    )
    const row = container.querySelector('[role="link"]') as HTMLElement
    fireEvent.keyDown(row, { key: "Enter" })
    expect(push).toHaveBeenCalledWith("/sandbox/transactions/sim-key456")
  })

  it("routes a genuinely on-chain row to Etherscan instead of the in-app router", () => {
    const realHash = `0x${"b".repeat(64)}`
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)
    const { container } = render(
      <DisplayPreferencesProvider>
        <RecentActivity rows={[makeRow({ id: "real-1", txHash: realHash })]} />
      </DisplayPreferencesProvider>,
    )
    const row = container.querySelector('[role="link"]') as HTMLElement
    fireEvent.click(row)
    expect(push).not.toHaveBeenCalled()
    expect(openSpy).toHaveBeenCalledWith(`https://etherscan.io/tx/${realHash}`, "_blank", "noopener,noreferrer")
    openSpy.mockRestore()
  })

  it("does not double-navigate when the hash link inside the row is clicked", () => {
    const { container } = render(
      <DisplayPreferencesProvider>
        <RecentActivity rows={[makeRow({ id: "sim-3", txHash: "sim-inner789" })]} />
      </DisplayPreferencesProvider>,
    )
    const link = hrefFor(container, "sim-inner789") as HTMLAnchorElement
    // The anchor has a real href; clicking it must not also fire the row's router.push.
    fireEvent.click(link)
    expect(push).not.toHaveBeenCalled()
  })
})

describe("RecentActivity amount sign convention (#F2)", () => {
  // One convention, applied by action kind: user cash flow (+ in / − out).
  it("assigns a consistent cash-flow sign to every action kind", () => {
    const cashIn: PortfolioActivityRow["kind"][] = ["borrow", "withdraw", "claim", "unstake", "reduce", "close"]
    const cashOut: PortfolioActivityRow["kind"][] = [
      "supply",
      "repay",
      "pledge",
      "stake",
      "open",
      "addCollateral",
      "liquidation",
    ]
    const neutral: PortfolioActivityRow["kind"][] = ["swap", "startCooldown", "rebalance", "interest"]

    for (const kind of cashIn) expect(AMOUNT_SIGN_BY_KIND[kind]).toBe(1)
    for (const kind of cashOut) expect(AMOUNT_SIGN_BY_KIND[kind]).toBe(-1)
    for (const kind of neutral) expect(AMOUNT_SIGN_BY_KIND[kind]).toBe(0)

    // The four rows called out in the finding now read the right way round: cash the
    // user receives is +, cash they pay out is −.
    expect(AMOUNT_SIGN_BY_KIND.borrow).toBe(1) // was "-$5"
    expect(AMOUNT_SIGN_BY_KIND.withdraw).toBe(1) // was "-$127"
    expect(AMOUNT_SIGN_BY_KIND.repay).toBe(-1) // was "+$40"
    expect(AMOUNT_SIGN_BY_KIND.pledge).toBe(-1) // was "+$10"
  })

  it("renders the sign from the kind, not the raw amount's stored sign", () => {
    // Same positive stored magnitude, opposite displayed sign — proof the sign is
    // derived from the kind and the magnitude is taken as an absolute value.
    const { container } = render(
      <DisplayPreferencesProvider>
        <RecentActivity
          rows={[
            makeRow({ id: "borrow", txHash: "sim-borrow", product: "borrow", kind: "borrow", amountUsd: 5 }),
            makeRow({ id: "repay", txHash: "sim-repay", product: "borrow", kind: "repay", amountUsd: 40 }),
            makeRow({ id: "swap", txHash: "sim-swap", product: "swap", kind: "swap", amountUsd: 12 }),
          ]}
        />
      </DisplayPreferencesProvider>,
    )
    const view = within(container)
    // Rows render on both the mobile card and the desktop table, so each string appears twice.
    expect(view.getAllByText("+$5").length).toBeGreaterThan(0)
    expect(view.getAllByText("-$40").length).toBeGreaterThan(0)
    // A value-neutral swap carries no sign.
    expect(view.getAllByText("$12").length).toBeGreaterThan(0)
    expect(view.queryByText("+$12")).not.toBeInTheDocument()
    expect(view.queryByText("-$12")).not.toBeInTheDocument()
  })

  it("shows the cash-flow legend", () => {
    const { container } = render(
      <DisplayPreferencesProvider>
        <RecentActivity rows={[makeRow({ id: "sim-1", txHash: "sim-abc" })]} />
      </DisplayPreferencesProvider>,
    )
    expect(within(container).getByText(/cash flow/i)).toBeInTheDocument()
  })
})
