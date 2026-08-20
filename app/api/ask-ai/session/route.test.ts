import { describe, expect, it } from "vitest"
import { ASK_AI_GUEST_COOKIE, readAskGuestId } from "./route"

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
