import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AskAIPageClient } from "../ask-ai-page-client"

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => async () => ({ threadId: "thread-test", title: "New Chat" }),
}))

afterEach(cleanup)

describe("AskAIPageClient", () => {
  it("renders the public empty state and scoped suggestions", () => {
    render(<AskAIPageClient />)

    expect(screen.getByRole("heading", { name: "How can I help you today?", level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Positions" })).toBeInTheDocument()
    expect(screen.queryByText(/GPT-5.6 Luna/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /attach/i })).not.toBeInTheDocument()
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

  it("creates a new persisted thread without changing sidebar state", async () => {
    const user = userEvent.setup()
    render(<AskAIPageClient />)

    await user.click(screen.getByRole("button", { name: "Open sidebar" }))
    await user.click(screen.getByRole("button", { name: "New Thread" }))
    expect(screen.getByRole("button", { name: "Hide sidebar" })).toBeInTheDocument()
  })
})
