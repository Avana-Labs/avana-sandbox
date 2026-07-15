import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ActionSessionLoading } from "@/app/components/action-page/action-session-loading"

describe("ActionSessionLoading", () => {
  it("announces wallet hydration without rendering seeded position values", () => {
    render(<ActionSessionLoading />)
    expect(screen.getByRole("status")).toHaveTextContent("Loading wallet position")
  })
})
