import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LendHero } from "../lend-hero"

vi.mock("@/app/components/display-preferences", () => ({
  useDisplayPreferences: () => ({ showDollarAmounts: true }),
}))

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="line-chart">{children}</svg>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Line: ({ stroke }: { stroke: string }) => <div data-testid="line" data-stroke={stroke} />,
}))

describe("LendHero", () => {
  const props = {
    totalValue: 12480.55,
    totalEarned: 498.2,
    openDeposit: vi.fn(),
    openWithdraw: vi.fn(),
  }

  it("uses the reference orange stroke", () => {
    const { getByTestId } = render(<LendHero {...props} />)

    expect(getByTestId("line")).toHaveAttribute("data-stroke", "hsl(var(--brand))")
  })
})
