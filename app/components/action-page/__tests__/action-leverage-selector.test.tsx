import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionLeverageSelector } from "@/app/components/action-page/action-leverage-selector"

afterEach(() => cleanup())

describe("ActionLeverageSelector", () => {
  it("renders an option button for each leverage preset", () => {
    render(<ActionLeverageSelector value="2" onChange={() => {}} options={[1.5, 2, 3, 5]} />)
    expect(screen.getByRole("button", { name: "1.5x" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "2x" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "3x" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "5x" })).toBeTruthy()
  })

  it("marks the current value as active", () => {
    render(<ActionLeverageSelector value="3" onChange={() => {}} options={[1.5, 2, 3, 5]} />)
    expect(screen.getByRole("button", { name: "3x" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "2x" }).getAttribute("aria-pressed")).toBe("false")
  })

  it("lets the user switch leverage (not locked to a single value)", () => {
    const onChange = vi.fn()
    render(<ActionLeverageSelector value="2" onChange={onChange} options={[1.5, 2, 3, 5]} />)
    fireEvent.click(screen.getByRole("button", { name: "5x" }))
    expect(onChange).toHaveBeenCalledWith("5")
  })

  it("renders nothing when there are no options", () => {
    const { container } = render(<ActionLeverageSelector value="2" onChange={() => {}} options={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
