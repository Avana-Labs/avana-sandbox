import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { AskAIPageClient } from "../ask-ai-page-client"

afterEach(cleanup)

describe("AskAIPageClient", () => {
  it("renders the public empty state and scoped suggestions", () => {
    render(<AskAIPageClient />)

    expect(screen.getByRole("heading", { name: "Ask Avana", level: 2 })).toBeInTheDocument()
    expect(screen.getByText("Explain LP collateral")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Ask Avana a question" })).toHaveAttribute("maxlength", "2000")
  })

  it("opens and closes mobile thread history", async () => {
    const user = userEvent.setup()
    render(<AskAIPageClient />)

    await user.click(screen.getByRole("button", { name: "Open thread history" }))
    expect(screen.getByRole("button", { name: "Close thread history" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Close thread history" }))
    expect(screen.queryByRole("button", { name: "Close thread history" })).not.toBeInTheDocument()
  })
})
