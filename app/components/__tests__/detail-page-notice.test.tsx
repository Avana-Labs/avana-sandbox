import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { DetailPageNotice } from "@/app/components/detail-page-primitives"

describe("DetailPageNotice", () => {
  afterEach(() => {
    cleanup()
  })

  it("p0-05: borrow variant keeps LP liquidation risk copy", () => {
    render(<DetailPageNotice product="borrow" />)
    expect(screen.getByRole("note")).toHaveTextContent(/Borrowing against LP tokens/)
  })

  it("p0-05: lend variant does not ship borrow-LP liquidation copy", () => {
    render(<DetailPageNotice product="lend" />)
    const note = screen.getByRole("note")
    expect(note).not.toHaveTextContent(/Borrowing against LP tokens/)
    expect(note).toHaveTextContent(/Supplying assets/)
  })

  it("p0-05: multiply variant does not ship borrow-LP liquidation copy", () => {
    render(<DetailPageNotice product="multiply" />)
    const note = screen.getByRole("note")
    expect(note).not.toHaveTextContent(/Borrowing against LP tokens/)
    expect(note).toHaveTextContent(/Multiply loops/)
  })
})
