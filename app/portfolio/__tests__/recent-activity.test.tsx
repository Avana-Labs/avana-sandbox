import { render, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RecentActivity } from "@/app/portfolio/recent-activity"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"

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
