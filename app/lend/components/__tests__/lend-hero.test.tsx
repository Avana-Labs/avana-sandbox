import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LendHero } from "../lend-hero"

let resolvedTheme: "light" | "dark" = "light"

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme }),
}))

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="area-chart">{children}</svg>,
  Tooltip: () => null,
  Area: ({ stroke, fill }: { stroke: string; fill: string }) => <div data-testid="area" data-stroke={stroke} data-fill={fill} />,
}))

describe("LendHero", () => {
  const props = {
    totalValue: 12480.55,
    totalEarned: 498.2,
    openDeposit: vi.fn(),
    openWithdraw: vi.fn(),
  }

  beforeEach(() => {
    resolvedTheme = "light"
  })

  it("uses a blended deposit-token accent in light mode", () => {
    const { container, getByTestId } = render(<LendHero {...props} />)
    const stops = container.querySelectorAll("stop")

    expect(getByTestId("area")).toHaveAttribute("data-stroke", "rgba(29, 117, 178, 0.58)")
    expect(stops[0]?.getAttribute("stop-color")).toBe("rgba(29, 117, 178, 0.22)")
    expect(stops[1]?.getAttribute("stop-color")).toBe("rgba(29, 117, 178, 0)")
  })

  it("uses a brighter token blend in dark mode", () => {
    resolvedTheme = "dark"
    const { container, getByTestId } = render(<LendHero {...props} />)
    const stops = container.querySelectorAll("stop")

    expect(getByTestId("area")).toHaveAttribute("data-stroke", "rgba(79, 180, 216, 0.78)")
    expect(stops[0]?.getAttribute("stop-color")).toBe("rgba(79, 180, 216, 0.3)")
    expect(stops[1]?.getAttribute("stop-color")).toBe("rgba(79, 180, 216, 0)")
  })
})
