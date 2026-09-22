import { describe, expect, it, vi } from "vitest"

const { session, fetchLendPage } = vi.hoisted(() => ({
  session: { cookie: undefined as string | undefined },
  fetchLendPage: vi.fn(async () => ({})),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "avana_siwe" && session.cookie ? { value: session.cookie } : undefined),
  }),
  headers: async () => new Headers(),
}))
vi.mock("@/app/lib/siwe/jwt", () => ({
  verifySiweSessionJwt: (token: string) => (token === "valid" ? { wallet: "0xabc", exp: Date.now() + 60_000 } : null),
}))
vi.mock("@/app/lib/data/providers/lend", () => ({ fetchLendPage }))
vi.mock("@/app/lend/lend-client", () => ({ LendClient: () => null }))

import LendPage from "@/app/lend/page"
import { GuestPagePlaceholder } from "@/app/components/sandbox/guest-page-placeholder"

describe("gated page SSR for guests", () => {
  it("renders the placeholder without reading Convex when there is no session", async () => {
    session.cookie = undefined
    const element = await LendPage()
    expect(element.type).toBe(GuestPagePlaceholder)
    expect(fetchLendPage).not.toHaveBeenCalled()
  })

  it("treats an invalid or expired session cookie as a guest", async () => {
    session.cookie = "forged"
    const element = await LendPage()
    expect(element.type).toBe(GuestPagePlaceholder)
    expect(fetchLendPage).not.toHaveBeenCalled()
  })

  it("fetches the page for a verified session", async () => {
    session.cookie = "valid"
    await LendPage()
    expect(fetchLendPage).toHaveBeenCalledTimes(1)
  })
})
