import { afterEach, describe, expect, it, vi } from "vitest"
import { canonicalPriceUsd, resetCanonicalPrices } from "@/app/lib/prices/canonical"

// Control the server-side oracle fetch so the test never touches a real Convex deployment.
const { fetchTokenPrices } = vi.hoisted(() => ({ fetchTokenPrices: vi.fn() }))
vi.mock("@/app/lib/borrow-system/market-hydration-server", () => ({ fetchTokenPrices }))

import { hydrateCanonicalPricesFromConvex } from "@/app/lib/prices/server-hydrate"

afterEach(() => {
  resetCanonicalPrices()
  fetchTokenPrices.mockReset()
})

describe("hydrateCanonicalPricesFromConvex", () => {
  it("overlays live oracle prices onto the canonical store (fixture -> live)", async () => {
    // Sanity: before hydrate the store is the deterministic fixture.
    expect(canonicalPriceUsd("AAVE")).toBe(105)

    // fetchTokenPrices emits lowercase symbol keys, like the Convex query does.
    fetchTokenPrices.mockResolvedValue({ aave: 88.25, weth: 1905.92 })
    await hydrateCanonicalPricesFromConvex()

    expect(canonicalPriceUsd("AAVE")).toBe(88.25)
    expect(canonicalPriceUsd("WETH")).toBe(1905.92)
  })

  it("keeps the fixture when the oracle is unavailable (null)", async () => {
    fetchTokenPrices.mockResolvedValue(null)
    await hydrateCanonicalPricesFromConvex()
    expect(canonicalPriceUsd("AAVE")).toBe(105)
  })

  it("never throws when the fetch rejects, leaving the fixture intact", async () => {
    fetchTokenPrices.mockRejectedValue(new Error("convex unreachable"))
    await expect(hydrateCanonicalPricesFromConvex()).resolves.toBeUndefined()
    expect(canonicalPriceUsd("AAVE")).toBe(105)
  })
})
