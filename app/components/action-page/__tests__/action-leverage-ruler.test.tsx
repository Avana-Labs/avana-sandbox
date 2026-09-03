import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionLeverageRuler } from "@/app/components/action-page/action-leverage-ruler"

afterEach(() => cleanup())

describe("ActionLeverageRuler", () => {
  it("shows Multiplier header, value pill, and five evenly spaced scale ticks", () => {
    render(<ActionLeverageRuler value="1" onChange={() => {}} min={1} max={10} />)

    expect(screen.getByTestId("action-leverage-ruler")).toHaveTextContent("Multiplier")
    expect(screen.getByTestId("action-leverage-pill")).toHaveTextContent("1x")

    const ticks = screen.getByTestId("action-leverage-ticks")
    expect(ticks).toHaveTextContent("1x")
    expect(ticks).toHaveTextContent("3.25x")
    expect(ticks).toHaveTextContent("5.5x")
    expect(ticks).toHaveTextContent("7.75x")
    expect(ticks).toHaveTextContent("10x")
  })

  it("updates the pill when the slider moves", () => {
    const onChange = vi.fn()
    render(<ActionLeverageRuler value="2" onChange={onChange} min={1} max={10} label="Multiplier" />)

    const slider = screen.getByRole("slider", { name: "Multiplier" })
    fireEvent.change(slider, { target: { value: "6.7" } })

    expect(onChange).toHaveBeenCalledWith("6.7")
  })

  it("exposes the slider with an accessible label", () => {
    render(<ActionLeverageRuler value="2" onChange={() => {}} min={1} max={10} label="Multiplier" />)

    expect(screen.getByRole("slider", { name: "Multiplier" })).toBeInTheDocument()
  })

  it("does not render number input, recommended copy, or USD endpoints", () => {
    render(<ActionLeverageRuler value="2" onChange={() => {}} min={1} max={10} />)

    expect(screen.queryByRole("spinbutton")).toBeNull()
    expect(screen.queryByText(/Recommended up to/i)).toBeNull()
    expect(screen.queryByText(/USD/)).toBeNull()
  })
})
