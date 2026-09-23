import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getFunctionName, type FunctionReference } from "convex/server"

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }))
vi.mock("convex/react", () => ({ useQuery }))

import ConvexTokenPrices from "@/app/lib/prices/convex-token-prices"
import { TokenPricesContext } from "@/app/lib/prices/token-prices-context"

describe("ConvexTokenPrices", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const now = Date.now()
    const rows = [
      { symbol: "ETH", priceUsd: 3000, status: "fresh", fetchedAt: now, sourceUpdatedAt: now, updatedAt: now },
    ]
    const snapshot = {
      prices: rows,
      status: { updatedAt: now, staleAfterMs: 1_200_000, invalidAfterMs: 3_600_000, count: 1 },
    }
    const status = { updatedAt: now, staleAfterMs: 1_200_000, count: 1 }
    const fx = { rates: [] }
    const byName: Record<string, unknown> = {
      "prices:getPriceSnapshot": snapshot,
      "prices:getPriceStatus": status,
      "fx:getFxRates": fx,
    }
    useQuery.mockImplementation((ref: FunctionReference<"query">) => byName[getFunctionName(ref)])
  })
  afterEach(() => {
    vi.useRealTimers()
    useQuery.mockReset()
  })

  it("keeps the prices map identity across the 60s validation tick when nothing changed", () => {
    const seen: Array<Record<string, number>> = []
    function Consumer() {
      seen.push(React.useContext(TokenPricesContext))
      return null
    }
    const MemoConsumer = React.memo(Consumer)
    render(
      <ConvexTokenPrices>
        <MemoConsumer />
      </ConvexTokenPrices>,
    )
    const rendersBefore = seen.length
    expect(seen.at(-1)?.eth).toBe(3000)

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(seen.length).toBe(rendersBefore)
  })
})
