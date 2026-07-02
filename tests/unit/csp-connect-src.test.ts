import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

async function resolveConnectSrc() {
  // next.config.mjs computes connect-src at import time, so reset the module
  // registry and re-import after stubbing env for each scenario.
  vi.resetModules()
  const mod = await import("../../next.config.mjs")
  const headers = await mod.default.headers()
  const csp = headers[0].headers.find((h: { key: string }) => h.key === "Content-Security-Policy")
    .value as string
  const directive = csp.split("; ").find((d) => d.startsWith("connect-src")) as string
  return directive.slice("connect-src ".length).split(" ")
}

describe("CSP connect-src (#137)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example-app.convex.cloud")
    vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "https://example-app.convex.site")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("does not allow blanket https: or wss:", async () => {
    const sources = await resolveConnectSrc()
    expect(sources).not.toContain("https:")
    expect(sources).not.toContain("wss:")
  })

  it("lists the explicit Convex origins in both transports so realtime works", async () => {
    const sources = await resolveConnectSrc()
    expect(sources).toContain("https://example-app.convex.cloud")
    expect(sources).toContain("wss://example-app.convex.cloud")
    expect(sources).toContain("https://example-app.convex.site")
    expect(sources).toContain("wss://example-app.convex.site")
  })

  it("keeps the wallet/RPC origins the client needs", async () => {
    const sources = await resolveConnectSrc()
    expect(sources).toContain("'self'")
    expect(sources).toContain("https://eth.merkle.io")
    expect(sources).toContain("wss://relay.walletconnect.org")
    expect(sources).toContain("https://*.coinbase.com")
  })
})
