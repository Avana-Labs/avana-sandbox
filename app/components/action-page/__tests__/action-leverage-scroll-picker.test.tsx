import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionLeverageScrollPicker } from "@/app/components/action-page/action-leverage-scroll-picker"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ActionLeverageScrollPicker", () => {
  it("renders the current multiplier prominently", () => {
    render(<ActionLeverageScrollPicker value="2" onChange={() => {}} min={1} max={20} />)
    expect(screen.getByTestId("leverage-value")).toHaveTextContent("2x")
  })

  it("jumps to min and max with shortcut buttons", () => {
    const onChange = vi.fn()
    render(<ActionLeverageScrollPicker value="5" onChange={onChange} min={1} max={20} />)

    fireEvent.click(screen.getByRole("button", { name: "Min" }))
    expect(onChange).toHaveBeenCalledWith("1")

    fireEvent.click(screen.getByRole("button", { name: "Max" }))
    expect(onChange).toHaveBeenCalledWith("20")
  })

  it("shows liquidation MAX message only when flagged", () => {
    const { rerender } = render(
      <ActionLeverageScrollPicker value="10" onChange={() => {}} min={1} max={20} showLiquidationMaxMessage={false} />,
    )
    expect(screen.queryByTestId("leverage-max-risk")).toBeNull()

    rerender(
      <ActionLeverageScrollPicker value="10" onChange={() => {}} min={1} max={20} showLiquidationMaxMessage />,
    )
    expect(screen.getByTestId("leverage-max-risk")).toHaveTextContent(/liquidation/i)
  })

  it("updates value when the ruler is dragged", () => {
    const onChange = vi.fn()
    const { container } = render(<ActionLeverageScrollPicker value="1.5" onChange={onChange} min={1} max={20} />)
    const slider = container.querySelector('[role="slider"]') as HTMLDivElement
    Object.defineProperty(slider, "clientWidth", { configurable: true, value: 280 })
    slider.scrollLeft = 0

    fireEvent.pointerDown(slider, { clientX: 180, pointerId: 1 })
    fireEvent.pointerMove(slider, { clientX: 80, pointerId: 1 })
    fireEvent.pointerUp(slider, { clientX: 80, pointerId: 1 })

    expect(onChange).toHaveBeenCalled()
  })
})
