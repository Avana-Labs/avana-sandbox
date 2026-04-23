import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BalanceChart } from "../balance-chart"

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

describe("BalanceChart", () => {
  beforeEach(() => {
    resolvedTheme = "light"
  })

  it("uses a blended market accent in light mode", () => {
    const { container, getByTestId } = render(<BalanceChart />)
    const stops = container.querySelectorAll("stop")

    expect(getByTestId("area")).toHaveAttribute("data-stroke", "rgba(140, 82, 157, 0.58)")
    expect(stops[0]?.getAttribute("stop-color")).toBe("rgba(140, 82, 157, 0.22)")
    expect(stops[1]?.getAttribute("stop-color")).toBe("rgba(140, 82, 157, 0)")
  })

  it("lifts the accent in dark mode", () => {
    resolvedTheme = "dark"
    const { container, getByTestId } = render(<BalanceChart />)
    const stops = container.querySelectorAll("stop")

    expect(getByTestId("area")).toHaveAttribute("data-stroke", "rgba(182, 157, 178, 0.78)")
    expect(stops[0]?.getAttribute("stop-color")).toBe("rgba(182, 157, 178, 0.3)")
    expect(stops[1]?.getAttribute("stop-color")).toBe("rgba(182, 157, 178, 0)")
  })
})
