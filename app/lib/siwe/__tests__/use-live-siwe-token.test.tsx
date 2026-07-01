import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useConvexSiweAuth, useLiveSiweToken } from "@/app/lib/siwe/use-siwe-auth"
import { clearSiweToken, getSiweToken, setSiweToken } from "@/app/lib/siwe/auth-store"

const WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"

/** JWT-shaped string with a real `exp` claim (seconds); signature is junk. */
function jwtWithExp(expSeconds: number): string {
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url")
  return `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ wallet: WALLET, exp: expSeconds })}.sig`
}

const nowSec = () => Math.floor(Date.now() / 1000)

describe("useLiveSiweToken (expired-JWT recovery)", () => {
  beforeEach(() => clearSiweToken())
  afterEach(() => clearSiweToken())

  it("exposes a token that is still comfortably within its TTL", () => {
    setSiweToken(jwtWithExp(nowSec() + 3600), WALLET)
    const { result } = renderHook(() => useLiveSiweToken())
    expect(result.current?.wallet).toBe(WALLET)
  })

  it("reads an expired token as signed-out and clears it so a reload recovers", async () => {
    setSiweToken(jwtWithExp(nowSec() - 60), WALLET)
    expect(getSiweToken()).not.toBeNull() // stored, as after a reload with a stale token

    const { result } = renderHook(() => useLiveSiweToken())

    expect(result.current).toBeNull()
    await waitFor(() => {
      // The dead token is purged from the store (and localStorage) by the cleanup effect.
      expect(getSiweToken()).toBeNull()
    })
  })

  it("reports unauthenticated to Convex and withholds an expired JWT", async () => {
    setSiweToken(jwtWithExp(nowSec() - 60), WALLET)
    const { result } = renderHook(() => useConvexSiweAuth())

    expect(result.current.isAuthenticated).toBe(false)
    await expect(result.current.fetchAccessToken({ forceRefreshToken: false })).resolves.toBeNull()
  })

  it("reports authenticated and hands Convex a live JWT", async () => {
    const jwt = jwtWithExp(nowSec() + 3600)
    setSiweToken(jwt, WALLET)
    const { result } = renderHook(() => useConvexSiweAuth())

    expect(result.current.isAuthenticated).toBe(true)
    await expect(result.current.fetchAccessToken({ forceRefreshToken: false })).resolves.toBe(jwt)
  })
})
