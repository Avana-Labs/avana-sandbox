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

  it("enables mock data only when explicitly requested", () => {
    vi.stubEnv("AVANA_DATA_SOURCE", "mock")
    expect(resolveDataSourceMode()).toBe("mock")
  })
})
