import { afterEach, describe, expect, it, vi } from "vitest"

describe("open gate test mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("stays locked outside development unless the explicit public test flag is enabled", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE", "0")
    const locked = await import("@/app/lib/test-mode")
    expect(locked.IS_OPEN_GATE_TEST_MODE).toBe(false)

    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE", "1")
    const open = await import("@/app/lib/test-mode")
    expect(open.IS_OPEN_GATE_TEST_MODE).toBe(true)
    expect(open.TEST_MODE_WALLET_ADDRESS).toMatch(/^0x[0-9a-f]{40}$/)
  })

  it("opens automatically on the local development server", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE", "0")

    const local = await import("@/app/lib/test-mode")
    expect(local.IS_OPEN_GATE_TEST_MODE).toBe(true)
  })
})
