import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AskAILoadingBody } from "@/app/ask/components/ask-ai-skeleton"

describe("Ask AI loading body", () => {
  it("keeps initialization chrome stable without showing the thread skeleton early", () => {
    const { container } = render(<AskAILoadingBody />)

    expect(screen.queryByTestId("ask-ai-thread-skeleton")).not.toBeInTheDocument()
    expect(container.querySelector("section")?.firstElementChild).toHaveClass("h-16")
  })
})
