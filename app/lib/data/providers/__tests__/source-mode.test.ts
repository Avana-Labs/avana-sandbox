import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"

describe("resolveDataSourceMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("defaults to live Convex data", () => {
    vi.stubEnv("AVANA_DATA_SOURCE", "")
    expect(resolveDataSourceMode()).toBe("live")
  })

  it("enables mock data when explicitly requested", () => {
    vi.stubEnv("AVANA_DATA_SOURCE", "mock")
    expect(resolveDataSourceMode()).toBe("mock")
  })

  it("uses mock market data for the open-gate browser test wallet", () => {
    vi.stubEnv("AVANA_DATA_SOURCE", "live")
    vi.stubEnv("NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE", "1")
    expect(resolveDataSourceMode()).toBe("mock")
  })

  it("uses mock market data when the dev open-gate flag is enabled", () => {
    // The dev open-gate is now an explicit opt-in (NEXT_PUBLIC_DEV_OPEN_GATE), not automatic on
    // NODE_ENV=development — a plain dev server uses live Convex data unless explicitly opted in.
    vi.stubEnv("AVANA_DATA_SOURCE", "live")
    vi.stubEnv("NEXT_PUBLIC_DEV_OPEN_GATE", "1")
    expect(resolveDataSourceMode()).toBe("mock")
  })
})
