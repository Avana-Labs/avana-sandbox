import { beforeEach, describe, expect, it } from "vitest"
import {
  ASK_AI_GUEST_COOKIE,
  MINT_THROTTLE_MAX,
  allowGuestMint,
  readAskGuestId,
  readClientIp,
  resetGuestMintThrottle,
} from "../route"

describe("Ask AI durable guest identity", () => {
  it("reuses a valid durable guest cookie", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000"
    expect(readAskGuestId(`theme=dark; ${ASK_AI_GUEST_COOKIE}=${id}; locale=en`)).toBe(id)
  })

  it.each([
    null,
    "",
    `${ASK_AI_GUEST_COOKIE}=not-a-uuid`,
    `${ASK_AI_GUEST_COOKIE}=123e4567-e89b-12d3-a456-426614174000`,
  ])("rejects an absent or invalid guest cookie: %s", (cookie) => expect(readAskGuestId(cookie)).toBeNull())
})

describe("Ask AI guest mint throttle", () => {
  beforeEach(() => resetGuestMintThrottle())

  it("reads the first client IP from x-forwarded-for", () => {
    const request = new Request("https://example.com", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } })
    expect(readClientIp(request)).toBe("203.0.113.7")
  })

  it("falls back to x-real-ip then a sentinel", () => {
    expect(readClientIp(new Request("https://example.com", { headers: { "x-real-ip": "198.51.100.9" } }))).toBe(
      "198.51.100.9",
    )
    expect(readClientIp(new Request("https://example.com"))).toBe("unknown")
  })

  it("allows new mints up to the per-IP budget then throttles", () => {
    const now = 1_000_000
    for (let i = 0; i < MINT_THROTTLE_MAX; i++) expect(allowGuestMint("203.0.113.7", now)).toBe(true)
    expect(allowGuestMint("203.0.113.7", now)).toBe(false)
    // A different IP keeps its own independent budget.
    expect(allowGuestMint("198.51.100.9", now)).toBe(true)
  })

  it("frees budget once the window elapses", () => {
    const start = 1_000_000
    for (let i = 0; i < MINT_THROTTLE_MAX; i++) allowGuestMint("203.0.113.7", start)
    expect(allowGuestMint("203.0.113.7", start)).toBe(false)
    expect(allowGuestMint("203.0.113.7", start + 60 * 60 * 1_000 + 1)).toBe(true)
  })
})
