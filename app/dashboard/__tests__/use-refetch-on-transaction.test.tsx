import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useRefetchOnTransaction } from "@/app/dashboard/use-refetch-on-transaction"

describe("useRefetchOnTransaction (dashboard stale-cache prevention)", () => {
  it("does not refetch on initial mount", () => {
    const refetch = vi.fn()
    renderHook(({ count }) => useRefetchOnTransaction(count, refetch), {
      initialProps: { count: 3 },
    })
    expect(refetch).not.toHaveBeenCalled()
  })

  it("refetches once when the transaction count increases (an action landed)", () => {
    const refetch = vi.fn()
    const { rerender } = renderHook(({ count }) => useRefetchOnTransaction(count, refetch), {
      initialProps: { count: 3 },
    })
    rerender({ count: 4 })
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("refetches again on each subsequent action", () => {
    const refetch = vi.fn()
    const { rerender } = renderHook(({ count }) => useRefetchOnTransaction(count, refetch), {
      initialProps: { count: 0 },
    })
    rerender({ count: 1 })
    rerender({ count: 2 })
    rerender({ count: 3 })
    expect(refetch).toHaveBeenCalledTimes(3)
  })

  it("does not refetch when the count is unchanged across re-renders", () => {
    const refetch = vi.fn()
    const { rerender } = renderHook(({ count }) => useRefetchOnTransaction(count, refetch), {
      initialProps: { count: 2 },
    })
    rerender({ count: 2 })
    rerender({ count: 2 })
    expect(refetch).not.toHaveBeenCalled()
  })

  it("does not refetch when the count decreases (e.g. wallet switch/reset)", () => {
    const refetch = vi.fn()
    const { rerender } = renderHook(({ count }) => useRefetchOnTransaction(count, refetch), {
      initialProps: { count: 5 },
    })
    rerender({ count: 0 })
    expect(refetch).not.toHaveBeenCalled()
  })

  it("resumes refetching after a reset once the count grows again", () => {
    const refetch = vi.fn()
    const { rerender } = renderHook(({ count }) => useRefetchOnTransaction(count, refetch), {
      initialProps: { count: 5 },
    })
    rerender({ count: 0 }) // reset — no refetch
    rerender({ count: 1 }) // new action after reset — refetch
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
