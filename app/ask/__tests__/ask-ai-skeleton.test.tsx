import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { AskAILoadingBody } from "@/app/ask/components/ask-ai-skeleton"

afterEach(cleanup)

describe("Ask AI loading body", () => {
  it("shows one complete layout-matched shell without interim copy", () => {
    const { container } = render(<AskAILoadingBody />)

    expect(screen.getByTestId("ask-ai-loading-body")).toBeInTheDocument()
    expect(screen.getByTestId("ask-ai-thread-skeleton")).toBeInTheDocument()
    expect(screen.queryByText("Loading conversations")).not.toBeInTheDocument()
    expect(screen.queryByText("No threads yet")).not.toBeInTheDocument()
    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(10)
  })

  it("shows the empty-chat shape only for a confirmed first-time user", () => {
    const { rerender } = render(<AskAILoadingBody emptyThread />)

    expect(screen.getByTestId("ask-ai-empty-thread-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("ask-ai-thread-skeleton")).not.toBeInTheDocument()

    rerender(<AskAILoadingBody />)
    expect(screen.queryByTestId("ask-ai-empty-thread-skeleton")).not.toBeInTheDocument()
    expect(screen.getByTestId("ask-ai-thread-skeleton")).toBeInTheDocument()
  })
})
