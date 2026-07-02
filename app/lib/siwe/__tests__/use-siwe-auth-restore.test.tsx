import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { clearSiweToken, setSiweToken } from "@/app/lib/siwe/auth-store"

const WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"

/** JWT-shaped string with a real `exp` claim (seconds); signature is junk. */
function jwtWithExp(expSeconds: number): string {
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url")
  return `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ wallet: WALLET, exp: expSeconds })}.sig`
}

const nowSec = () => Math.floor(Date.now() / 1000)

// Mutable wagmi account state driven per-test to simulate reload/reconnect.
type Account = {
  address?: string
  chainId?: number
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
}
let account: Account = { isConnected: false, isConnecting: false, isReconnecting: false }

vi.mock("wagmi", () => ({
  useAccount: () => account,
  useSignMessage: () => ({ signMessageAsync: vi.fn() }),
}))

describe("useSiweAuth (reload reconnect state)", () => {
  beforeEach(() => {
    clearSiweToken()
    account = { isConnected: false, isConnecting: false, isReconnecting: false }
  })
  afterEach(() => clearSiweToken())

  it("reports isRestoring while wagmi reconnects a persisted session (avoids signed-out flash)", () => {
    setSiweToken(jwtWithExp(nowSec() + 3600), WALLET)
    account = { isConnected: false, isConnecting: false, isReconnecting: true }

    const { result } = renderHook(() => useSiweAuth())

    expect(result.current.isRestoring).toBe(true)
    expect(result.current.isSignedIn).toBe(false)
  })

  it("does not report isRestoring when there is no persisted session (genuinely signed out)", () => {
    account = { isConnected: false, isConnecting: false, isReconnecting: true }

    const { result } = renderHook(() => useSiweAuth())

    expect(result.current.isRestoring).toBe(false)
    expect(result.current.isSignedIn).toBe(false)
  })

  it("clears isRestoring and reports signed-in once the wallet reconnects", () => {
    setSiweToken(jwtWithExp(nowSec() + 3600), WALLET)
    account = { address: WALLET, chainId: 1, isConnected: true, isConnecting: false, isReconnecting: false }

    const { result } = renderHook(() => useSiweAuth())

    expect(result.current.isRestoring).toBe(false)
    expect(result.current.isSignedIn).toBe(true)
  })
})
