import { describe, expect, it } from "vitest"
import { assertSameOrigin, assertSameOriginRead } from "../request-guards"

function req(headers: Record<string, string>) {
  return new Request("https://avana.cc/api/siwe/verify", { method: "POST", headers })
}

function getReq(headers: Record<string, string>) {
  return new Request("https://avana.cc/api/fx-rates", { method: "GET", headers })
}

describe("assertSameOrigin — fail closed (P3-6)", () => {
  it("allows a matching origin/host", () => {
    expect(assertSameOrigin(req({ origin: "https://avana.cc", host: "avana.cc" }))).toBe(true)
  })

  it("rejects a cross-origin request", () => {
    expect(assertSameOrigin(req({ origin: "https://evil.example", host: "avana.cc" }))).toBe(false)
  })

  it("fails closed when the Origin header is absent", () => {
    expect(assertSameOrigin(req({ host: "avana.cc" }))).toBe(false)
  })

  it("fails closed when the Host header is absent", () => {
    // Request() may synthesize a Host, so exercise the guard directly with a bare headers bag.
    const bare = {
      headers: { get: (name: string) => (name === "origin" ? "https://avana.cc" : null) },
    } as unknown as Request
    expect(assertSameOrigin(bare)).toBe(false)
  })

  it("fails closed on a malformed Origin", () => {
    expect(assertSameOrigin(req({ origin: "not-a-url", host: "avana.cc" }))).toBe(false)
  })
})

describe("assertSameOriginRead — GET-tuned (fx-rates)", () => {
  it("allows a same-origin GET with no Origin header (the browser's real behavior)", () => {
    // This is exactly the request the app makes: same-origin GET → no Origin,
    // Sec-Fetch-Site: same-origin. assertSameOrigin would (wrongly) 403 this.
    expect(assertSameOriginRead(getReq({ host: "avana.cc", "sec-fetch-site": "same-origin" }))).toBe(true)
  })

  it("allows same-site and direct-navigation (none) fetches", () => {
    expect(assertSameOriginRead(getReq({ "sec-fetch-site": "same-site" }))).toBe(true)
    expect(assertSameOriginRead(getReq({ "sec-fetch-site": "none" }))).toBe(true)
  })

  it("blocks a cross-site fetch via Sec-Fetch-Site", () => {
    expect(assertSameOriginRead(getReq({ host: "avana.cc", "sec-fetch-site": "cross-site" }))).toBe(false)
  })

  it("falls back to Origin/Host comparison when Sec-Fetch-Site is absent", () => {
    expect(assertSameOriginRead(getReq({ origin: "https://avana.cc", host: "avana.cc" }))).toBe(true)
    expect(assertSameOriginRead(getReq({ origin: "https://evil.example", host: "avana.cc" }))).toBe(false)
  })

  it("allows when there is no cross-origin signal at all (server-side fetch)", () => {
    const bare = {
      headers: { get: () => null },
    } as unknown as Request
    expect(assertSameOriginRead(bare)).toBe(true)
  })
})
