import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { clearSiweToken, setSiweToken } from "@/app/lib/siwe/auth-store"

const WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"

/** JWT-shaped string with a real `exp` claim (seconds); signature is junk. */
function jwtWithExp(expSeconds: number): string {
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url")
  return `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ wallet: WALLET, exp: expSeconds })}.sig`
}

const nowSec = () => Math.floor(Date.now() / 1000)

// useSiweAuth is now purely token-driven (no wagmi) — signed-in state is read straight from
// the persisted SIWE JWT, which is the same token Convex verifies. There is no wallet-reconnect
// window to wait on anymore, so "restoring" is handled by the wallet gate, not this hook.
describe("useSiweAuth (token-driven auth state)", () => {
  beforeEach(() => clearSiweToken())
  afterEach(() => clearSiweToken())

  it("reports signed-out with no persisted token", () => {
    const { result } = renderHook(() => useSiweAuth())

    expect(result.current.isSignedIn).toBe(false)
    expect(result.current.authedWallet).toBe(null)
  })

  it("reports signed-in immediately from a valid persisted token (no reconnect needed)", () => {
    setSiweToken(jwtWithExp(nowSec() + 3600), WALLET)

    const { result } = renderHook(() => useSiweAuth())

    expect(result.current.isSignedIn).toBe(true)
    expect(result.current.authedWallet).toBe(WALLET)
  })

  it("reports signed-out for an expired token", () => {
    setSiweToken(jwtWithExp(nowSec() - 3600), WALLET)

    const { result } = renderHook(() => useSiweAuth())

    expect(result.current.isSignedIn).toBe(false)
    expect(result.current.authedWallet).toBe(null)
  })
})
