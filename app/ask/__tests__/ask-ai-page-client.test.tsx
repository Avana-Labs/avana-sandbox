import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { AskAIPageClient } from "../ask-ai-page-client"

afterEach(cleanup)

describe("AskAIPageClient", () => {
  it("renders the public empty state and scoped suggestions", () => {
    render(<AskAIPageClient />)

    expect(screen.getByRole("heading", { name: "How can I help you today?", level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Positions" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Current model GPT-5.6 Luna" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Ask Avana a question" })).toHaveAttribute("maxlength", "2000")
  })

  it("hides and opens the thread sidebar", async () => {
    const user = userEvent.setup()
    render(<AskAIPageClient />)

    await user.click(screen.getByRole("button", { name: "Open sidebar" }))
    expect(screen.getByRole("button", { name: "Hide sidebar" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Hide sidebar" }))
    expect(screen.getByRole("button", { name: "Open sidebar" })).toBeInTheDocument()
  })
})
