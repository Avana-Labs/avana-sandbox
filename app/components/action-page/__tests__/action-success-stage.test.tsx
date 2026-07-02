import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"

// jsdom does not advance performance.now() inside its rAF loop, so mount
// animations (AnimatedTextValue) never settle. Drive rAF with a far-future
// timestamp so the animation completes in a single frame.
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now() + 100000), 0) as unknown as number,
  )
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ActionMetricsBlock", () => {
  it("renders health factor rows with heart styling on after value", async () => {
    render(
      <ActionMetricsBlock
        rows={[
          {
            id: "health-factor",
            label: "Health factor",
            value: "6.59 → 1.08",
            before: "6.59",
            after: "1.08",
            tone: "warning",
          },
        ]}
      />,
    )

    expect(screen.getByTestId("action-health-factor-bar")).toBeInTheDocument()
    expect(screen.getByTestId("action-health-factor-card")).toBeInTheDocument()
    // The after value animates from the before value on mount, so wait for it to settle.
    await waitFor(() => expect(screen.getAllByText("1.08").length).toBeGreaterThan(0))
  })
})

describe("ActionSuccessStage", () => {
  it("renders receipt card when receipt context is provided", async () => {
    render(
      <DisplayPreferencesProvider>
        <ActionSuccessStage
          closeHref="/borrow"
          success={{
            title: "Borrow successful",
            description: "$1,000 processed.",
            receiptHash: "sim-123",
            metrics: [],
            primaryCtaLabel: "View borrow dashboard",
            primaryCtaHref: "/borrow",
            secondaryCtaLabel: "Done",
            receiptContext: {
              verb: "Borrow",
              amountLabel: "1000.00 USDC",
              rateLabel: "Borrow APY",
              rateValue: "7.04%",
              marketValue: "USDC · Core",
            },
          }}
        />
      </DisplayPreferencesProvider>,
    )

    expect(screen.getByTestId("action-success-stage")).toBeInTheDocument()
    expect(screen.getByText("Confirmed")).toBeInTheDocument()
    // amountLabel animates on mount; wait for the final value to settle.
    await waitFor(() => expect(screen.getByText("1000.00 USDC")).toBeInTheDocument())
  })

  it("links the receipt hash to its sandbox receipt page", () => {
    render(
      <DisplayPreferencesProvider>
        <ActionSuccessStage
          closeHref="/lend"
          success={{
            title: "Deposit successful",
            description: "$1,000 processed.",
            receiptHash: "sim-abc/1",
            metrics: [],
            primaryCtaLabel: "View lend dashboard",
            primaryCtaHref: "/lend",
            secondaryCtaLabel: "Done",
          }}
        />
      </DisplayPreferencesProvider>,
    )

    const link = screen.getByRole("link", { name: "sim-abc/1" })
    // Hash is URL-encoded so slashes don't break the receipt route.
    expect(link).toHaveAttribute("href", "/sandbox/transactions/sim-abc%2F1")
  })
})
