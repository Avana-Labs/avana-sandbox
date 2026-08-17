import { describe, expect, it } from "vitest"
import { assertSameOrigin } from "../request-guards"

function req(headers: Record<string, string>) {
  return new Request("https://avana.cc/api/siwe/verify", { method: "POST", headers })
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
