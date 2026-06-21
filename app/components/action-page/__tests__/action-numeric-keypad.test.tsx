import { fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionNumericKeypad } from "@/app/components/action-page/action-numeric-keypad"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ActionNumericKeypad", () => {
  it("appends digit keys to the amount", () => {
    const onChange = vi.fn()
    render(<ActionNumericKeypad value="" onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "5" }))
    expect(onChange).toHaveBeenCalledWith("5")
  })

  it("supports decimal entry once", () => {
    const onChange = vi.fn()
    render(<ActionNumericKeypad value="12" onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "." }))
    expect(onChange).toHaveBeenCalledWith("12.")
  })

  it("removes the last character with backspace", () => {
    const onChange = vi.fn()
    render(<ActionNumericKeypad value="120" onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(onChange).toHaveBeenCalledWith("12")
  })
})
