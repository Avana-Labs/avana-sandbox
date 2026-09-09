import { afterEach, describe, expect, it, vi } from "vitest"

const { applyLiveRates } = vi.hoisted(() => ({ applyLiveRates: vi.fn() }))
vi.mock("@/app/lib/currency/rates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/lib/currency/rates")>()),
  applyLiveRates,
}))
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }))

import { loadServerFxRates } from "../server-hydrate"
import { SERVER_SEED_WAIT_MS } from "@/app/lib/performance/server-seed"

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe("server FX hydration", () => {
  it("seeds supported live currencies for both SSR and client hydration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: "success", rates: { USD: 1, EUR: 0.86, GBP: 0.75, XYZ: 9 } }),
      }),
    )
    const rates = await loadServerFxRates()
    expect(rates).toMatchObject({ USD: 1, EUR: 0.86, GBP: 0.75 })
    expect(rates).not.toHaveProperty("XYZ")
    expect(applyLiveRates).toHaveBeenCalledWith(rates)
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it("does not hold rendering or apply a late response when the FX upstream stalls", async () => {
    vi.useFakeTimers()
    let resolve!: (response: unknown) => void
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise((done) => (resolve = done))),
    )
    const seed = loadServerFxRates()
    await vi.advanceTimersByTimeAsync(SERVER_SEED_WAIT_MS)
    await expect(seed).resolves.toEqual({})
    resolve({ ok: true, json: async () => ({ result: "success", rates: { EUR: 0.86 } }) })
    await vi.advanceTimersByTimeAsync(0)
    expect(applyLiveRates).not.toHaveBeenCalled()
  })

  it.each([
    { ok: false, status: 503 },
    { ok: true, json: async () => ({ result: "error" }) },
  ])("falls back when the upstream fails", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))
    await expect(loadServerFxRates()).resolves.toEqual({})
    expect(applyLiveRates).not.toHaveBeenCalled()
  })
})
