import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ActionLeverageRuler } from "@/app/components/action-page/action-leverage-ruler"

afterEach(() => cleanup())

describe("ActionLeverageRuler", () => {
  it("labels the ends with the leverage bounds when no exposure base is given", () => {
    render(<ActionLeverageRuler value="2" onChange={() => {}} min={1} max={5} />)

    expect(screen.getByText("1x")).toBeInTheDocument()
    expect(screen.getByText("5x")).toBeInTheDocument()
    // The Min/Max snap buttons were removed in favour of the draggable slider.
    expect(screen.queryByRole("button", { name: "Min" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Max" })).toBeNull()
  })

  it("labels the ends with the exposure range (base × min … base × max)", () => {
    render(
      <ActionLeverageRuler value="3" onChange={() => {}} min={1} max={10} exposureBaseUsd={1645} />,
    )

    // Left end = base × min (1645 × 1), right end = base × max (1645 × 10).
    expect(screen.getByText("$1,645 USD")).toBeInTheDocument()
    expect(screen.getByText("$16,450 USD")).toBeInTheDocument()
  })

  it("exposes the slider with an accessible label", () => {
    render(<ActionLeverageRuler value="2" onChange={() => {}} min={1} max={5} label="Target leverage" />)

    expect(screen.getByRole("slider", { name: "Target leverage multiplier" })).toBeInTheDocument()
  })
})
