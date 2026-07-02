import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionLeverageRuler } from "@/app/components/action-page/action-leverage-ruler"

afterEach(() => cleanup())

describe("ActionLeverageRuler", () => {
  it("gives the Min/Max tap targets a >=40px minimum height", () => {
    render(<ActionLeverageRuler value="2" onChange={() => {}} min={1} max={5} />)

    const minButton = screen.getByRole("button", { name: "Min" })
    const maxButton = screen.getByRole("button", { name: "Max" })

    // min-h-10 == 2.5rem == 40px keeps these primary controls above the mobile
    // 40px tap-target floor.
    expect(minButton.className).toContain("min-h-10")
    expect(maxButton.className).toContain("min-h-10")
  })

  it("snaps to the min and max bounds when the buttons are pressed", () => {
    const onChange = vi.fn()
    render(<ActionLeverageRuler value="2" onChange={onChange} min={1} max={5} />)

    fireEvent.click(screen.getByRole("button", { name: "Min" }))
    expect(onChange).toHaveBeenLastCalledWith("1")

    fireEvent.click(screen.getByRole("button", { name: "Max" }))
    expect(onChange).toHaveBeenLastCalledWith("5")
  })
})
