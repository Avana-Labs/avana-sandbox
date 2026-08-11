import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { buildHeroAreaGeometry, HeroAreaChart } from "../hero-area-chart"

const points = [
  { time: 1, value: 100, label: "10:00" },
  { time: 2, value: 108, label: "11:00" },
  { time: 3, value: 104, label: "12:00" },
]

describe("HeroAreaChart", () => {
  it("builds a smooth closed area without Recharts", () => {
    const geometry = buildHeroAreaGeometry(points, 400, 240, (value) => `axis:${Math.round(value)}`)
    expect(geometry.points).toHaveLength(3)
    expect(geometry.linePath).toContain(" C ")
    expect(geometry.areaPath).toMatch(/ Z$/)
    expect(geometry.axisTicks.map((tick) => tick.label)).toEqual(["axis:112", "axis:104", "axis:96"])
  })

  it("preserves hover selection, tooltip formatting, and pointer exit", () => {
    const onActiveIndexChange = vi.fn()
    render(
      <HeroAreaChart
        data={points}
        activeRange="1D"
        formatValue={(value) => `value:${value}`}
        formatYAxis={(value) => `axis:${Math.round(value)}`}
        onActiveIndexChange={onActiveIndexChange}
      />,
    )
    const chart = screen.getByTestId("hero-area-chart")
    vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 240,
      width: 300,
      height: 240,
      toJSON: () => ({}),
    })

    fireEvent.pointerMove(chart, { clientX: 150 })
    expect(screen.getByText("11:00")).toBeInTheDocument()
    expect(screen.getByText("value:108")).toBeInTheDocument()
    expect(screen.getByText("axis:112")).toBeInTheDocument()
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(1)

    fireEvent.pointerLeave(chart)
    expect(screen.queryByText("value:108")).not.toBeInTheDocument()
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(null)
  })
})
