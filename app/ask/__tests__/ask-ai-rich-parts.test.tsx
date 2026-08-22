import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Rich parts now come from the separate `messageParts` query, not embedded in
// the streamed messages. partsMock feeds that query (and harmlessly also the
// quota query, which these tests don't assert on).
const partsMock = vi.fn<() => Array<{ messageId: string; parts: unknown }>>(() => [])
vi.mock("convex/react", () => ({
  useAction: () => async () => ({ text: "Done" }),
  useQuery: () => partsMock(),
  // An active thread so the rich-parts subscriber mounts (its query is gated on a
  // resolved thread, matching production).
  usePaginatedQuery: () => ({
    results: [{ threadId: "thread-test", title: "T", status: "active", updatedAt: 1 }],
    status: "Exhausted",
    loadMore: vi.fn(),
  }),
  useMutation: () => async () => ({ threadId: "thread-test", title: "New Chat" }),
}))

const messagesMock = vi.fn()
vi.mock("@convex-dev/agent/react", () => ({
  useUIMessages: () => messagesMock(),
}))

import { AskAIPageClient } from "../ask-ai-page-client"

afterEach(() => {
  cleanup()
  messagesMock.mockReset()
  partsMock.mockReset()
  partsMock.mockReturnValue([])
})

describe("AskAIPageClient rich parts", () => {
  it("renders a financial result card and retrieval chunks from persisted richParts", () => {
    messagesMock.mockReturnValue({
      status: "Exhausted",
      loadMore: vi.fn(),
      results: [
        { id: "u1", role: "user", text: "How much can I borrow?", _creationTime: 1, status: "success" },
        {
          id: "a1",
          role: "assistant",
          text: "Here is your borrow capacity.",
          _creationTime: 2,
          status: "success",
        },
      ],
    })
    partsMock.mockReturnValue([
      {
        messageId: "a1",
        parts: {
          retrievalChunks: [
            { title: "Borrow docs", locator: "§2.1", text: "Collateral factors explained.", score: 0.91 },
          ],
          financialResults: [
            {
              kind: "borrow_capacity",
              dataProvenance: "sandbox",
              payload: {
                kind: "borrow_capacity",
                title: "Borrow capacity",
                freshness: "fresh",
                metrics: [{ label: "Available", value: "$1,200" }],
              },
            },
          ],
        },
      },
    ])

    render(<AskAIPageClient />)

    expect(screen.getByRole("region", { name: "Borrow capacity" })).toBeInTheDocument()
    expect(screen.getByText("$1,200")).toBeInTheDocument()
    expect(screen.getByText("Borrow docs")).toBeInTheDocument()
    // MarkdownText renders the answer as one node, so match the sentence.
    expect(screen.getByText(/Here is your borrow capacity/)).toBeInTheDocument()
  })

  it("reshapes a verbatim portfolio tool payload into a card", () => {
    messagesMock.mockReturnValue({
      status: "Exhausted",
      loadMore: vi.fn(),
      results: [
        {
          id: "a1",
          role: "assistant",
          text: "Here is your portfolio.",
          _creationTime: 2,
          status: "success",
        },
      ],
    })
    partsMock.mockReturnValue([
      {
        messageId: "a1",
        parts: {
          financialResults: [
            {
              kind: "portfolio",
              dataProvenance: "sandbox",
              payload: {
                walletRequired: false,
                dataProvenance: "sandbox",
                totals: { lendUsd: 1000, borrowUsd: 250, multiplyUsd: 0, liquidUsd: 42.5, umbrellaUsd: 500 },
                umbrella: [{ marketSlug: "gho", suppliedUsd6: "500000000" }],
                asOf: 0,
              },
            },
          ],
        },
      },
    ])

    render(<AskAIPageClient />)
    expect(screen.getByRole("region", { name: "Your Avana portfolio" })).toBeInTheDocument()
    expect(screen.getByText("$1,000.00")).toBeInTheDocument()
    expect(screen.getByText("$42.50")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Product" })).toBeInTheDocument()
    expect(screen.getByText("gho")).toBeInTheDocument()
  })

  it("renders cached market results as a table and real price history as a chart", () => {
    messagesMock.mockReturnValue({
      status: "Exhausted",
      loadMore: vi.fn(),
      results: [
        { id: "u1", role: "user", text: "ETH price", _creationTime: 1, status: "success" },
        { id: "a1", role: "assistant", text: "ETH is $4,321.", _creationTime: 2, status: "success" },
      ],
    })
    partsMock.mockReturnValue([
      {
        messageId: "a1",
        parts: {
          financialResults: [
            {
              kind: "market",
              payload: {
                providerData: [
                  {
                    source: "defillama",
                    kind: "token_price",
                    key: "weth",
                    data: { symbol: "weth", priceUsd: 4321 },
                    freshness: "fresh",
                  },
                ],
              },
            },
          ],
          visual: { label: "WETH price", value: "$4,321", delta: "+2.10%", points: [4200, 4250, 4321] },
        },
      },
    ])

    render(<AskAIPageClient />)
    expect(screen.getByRole("columnheader", { name: "Market" })).toBeInTheDocument()
    expect(screen.getByText("defillama")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "WETH price: $4,321" })).toBeInTheDocument()
  })

  it("does not fabricate a card when the payload is not display-ready", () => {
    messagesMock.mockReturnValue({
      status: "Exhausted",
      loadMore: vi.fn(),
      results: [
        {
          id: "a1",
          role: "assistant",
          text: "Answer.",
          _creationTime: 2,
          status: "success",
        },
      ],
    })
    partsMock.mockReturnValue([
      { messageId: "a1", parts: { financialResults: [{ kind: "portfolio", payload: { raw: 123 } }] } },
    ])

    render(<AskAIPageClient />)
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("shows a friendly error with no feedback or retry controls for a persisted failed turn", () => {
    messagesMock.mockReturnValue({
      status: "Exhausted",
      loadMore: vi.fn(),
      results: [
        { id: "u1", role: "user", text: "Break it", _creationTime: 1, status: "success" },
        { id: "a1", role: "assistant", text: "", _creationTime: 2, status: "failed" },
      ],
    })

    render(<AskAIPageClient />)

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copy answer" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Mark answer as helpful" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })
})
