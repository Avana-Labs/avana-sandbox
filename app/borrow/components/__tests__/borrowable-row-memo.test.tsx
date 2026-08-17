import { render, cleanup } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

// jsdom has no IntersectionObserver; some deferred-render children observe on mount.
beforeAll(() => {
  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
})

// Spy on the per-row formatter so we can count how many times a SPECIFIC row is
// rendered: the grouped desktop table (AssetsSection) calls formatApy(asset.borrowApr)
// exactly once per row per render, so a call with a given APR value == that row rendered.
vi.mock("@/app/lib/format", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/format")>()
  return { ...actual, formatApy: vi.fn(actual.formatApy) }
})

import { formatApy } from "@/app/lib/format"
import { BorrowableAssetsPanel } from "../borrowable-assets-table"
import type { BorrowableAsset } from "@/app/lib/data/borrow-domain"

const assetA: BorrowableAsset = {
  id: "uni-v3-bluechip:wbtc",
  symbol: "WBTC",
  name: "Wrapped Bitcoin",
  subtitle: "BTC",
  borrowApr: 3.4,
  totalBorrowedUsd: 9_600_000,
  utilization: 62,
  availableUsd: 4_200_000,
  walletBalanceLabel: "0.00",
  hasWalletBalance: false,
  visual: { symbol: "WBTC", shortLabel: "W", bgClass: "bg-amber-100", textClass: "text-amber-700" },
  trendUp: true,
  category: "btc",
}

const assetB: BorrowableAsset = {
  ...assetA,
  id: "uni-v3-bluechip:cbbtc",
  symbol: "CBBTC",
  name: "Coinbase Wrapped BTC",
  borrowApr: 5.5,
}

// The APR value that uniquely identifies row A across renders.
const ROW_A_APR = assetA.borrowApr

function countRowARenders() {
  const spy = vi.mocked(formatApy)
  return spy.mock.calls.filter(([apr]) => apr === ROW_A_APR).length
}

describe("BorrowableAssetsPanel row memoization", () => {
  afterEach(() => {
    cleanup()
    vi.mocked(formatApy).mockClear()
  })

  it("does not re-render an unchanged row when a sibling row's data changes", () => {
    // A stable onBorrow reference across re-renders, so React.memo isn't defeated by a
    // new callback identity on every parent render.
    const onBorrow = vi.fn()

    const { rerender } = render(<BorrowableAssetsPanel rows={[assetA, assetB]} onBorrow={onBorrow} />)

    // Row A rendered exactly once on the initial mount.
    expect(countRowARenders()).toBe(1)

    // Change ONLY row B's data (new object for B, same reference for A) and force the
    // parent (and its AssetsSection) to re-render.
    const assetBChanged: BorrowableAsset = { ...assetB, borrowApr: 9.9, availableUsd: 1_111_111 }
    rerender(<BorrowableAssetsPanel rows={[assetA, assetBChanged]} onBorrow={onBorrow} />)

    // Row A's props (asset reference, index, onBorrow) are unchanged, so a memoized row
    // must NOT re-render — formatApy(3.4) is not called a second time.
    expect(countRowARenders()).toBe(1)
  })
})
