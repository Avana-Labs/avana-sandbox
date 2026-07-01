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

  it("uses mock market data on the local development server", () => {
    vi.stubEnv("AVANA_DATA_SOURCE", "live")
    vi.stubEnv("NODE_ENV", "development")
    expect(resolveDataSourceMode()).toBe("mock")
  })
})
