import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

const enqueue = vi.fn()
const emptyQuery: never[] = []

vi.mock("convex/react", () => ({
  useQuery: () => emptyQuery,
  usePaginatedQuery: () => ({
    results: [{ threadId: "thread-test", title: "New Chat", status: "active", updatedAt: 1 }],
    status: "Exhausted",
    loadMore: vi.fn(),
  }),
  useMutation: () => enqueue,
}))

vi.mock("@convex-dev/agent/react", () => ({
  useUIMessages: () => ({ results: [], status: "Exhausted", loadMore: vi.fn() }),
}))

import { AskAIPageClient } from "../ask-ai-page-client"

beforeAll(() => {
  Object.defineProperty(Element.prototype, "scrollTo", { configurable: true, value: vi.fn() })
})

afterEach(() => {
  cleanup()
  enqueue.mockClear()
})

describe("Ask AI optimistic turn", () => {
  it("edits the middle of a controlled draft without jumping to the end", () => {
    render(<AskAIPageClient />)
    const composer = screen.getByLabelText("Ask Avana a question") as HTMLTextAreaElement
    fireEvent.change(composer, { target: { value: "ABCDE", selectionStart: 5, selectionEnd: 5 } })
    fireEvent.keyDown(composer, { key: "Home" })
    fireEvent.keyDown(composer, { key: "ArrowRight" })
    fireEvent.keyDown(composer, { key: "ArrowRight" })
    fireEvent.keyDown(composer, { key: "Delete" })
    expect(composer).toHaveValue("ABDE")
  })

  it("shows one user bubble before enqueueTurn resolves", async () => {
    let resolveEnqueue!: (value: { turnId: string; promptMessageId: string }) => void
    enqueue.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEnqueue = resolve
        }),
    )
    render(<AskAIPageClient />)
    const composer = screen.getByLabelText("Ask Avana a question")
    fireEvent.change(composer, { target: { value: "What is Bitcoin price now?" } })
    fireEvent.click(screen.getByRole("button", { name: "Send message" }))

    expect(await screen.findByText("What is Bitcoin price now?")).toBeInTheDocument()
    expect(screen.getAllByText("What is Bitcoin price now?")).toHaveLength(1)
    expect(enqueue).toHaveBeenCalledTimes(1)
    await act(async () => resolveEnqueue({ turnId: "turn-test", promptMessageId: "message-test" }))
  })
})
