import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearSiweToken, getSiweToken, setSiweToken, subscribeSiwe } from "@/app/lib/siwe/auth-store"

const STORAGE_KEY = "avana.siwe.token.v1"
const WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"

function fireStorage(newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue }))
}

describe("auth-store cross-tab sync", () => {
  beforeEach(() => clearSiweToken())
  afterEach(() => clearSiweToken())

  it("syncs a sign-in from another tab and notifies subscribers", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSiwe(listener)

    fireStorage(JSON.stringify({ jwt: "jwt-from-other-tab", wallet: WALLET }))

    expect(getSiweToken()).toEqual({ jwt: "jwt-from-other-tab", wallet: WALLET })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it("syncs a sign-out from another tab so no stale authed token remains", () => {
    setSiweToken("live-jwt", WALLET)
    expect(getSiweToken()).not.toBeNull()

    const listener = vi.fn()
    const unsubscribe = subscribeSiwe(listener)

    fireStorage(null) // other tab removed the key

    expect(getSiweToken()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it("syncs a wallet switch from another tab", () => {
    setSiweToken("jwt-a", WALLET)
    const otherWallet = "0x1111111111111111111111111111111111111111"

    const listener = vi.fn()
    const unsubscribe = subscribeSiwe(listener)

    fireStorage(JSON.stringify({ jwt: "jwt-b", wallet: otherWallet }))

    expect(getSiweToken()).toEqual({ jwt: "jwt-b", wallet: otherWallet })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it("does not notify when the incoming token is unchanged", () => {
    setSiweToken("same-jwt", WALLET)
    const listener = vi.fn()
    const unsubscribe = subscribeSiwe(listener)

    fireStorage(JSON.stringify({ jwt: "same-jwt", wallet: WALLET }))

    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })

  it("ignores storage events for unrelated keys", () => {
    setSiweToken("keep-jwt", WALLET)
    const listener = vi.fn()
    const unsubscribe = subscribeSiwe(listener)

    window.dispatchEvent(new StorageEvent("storage", { key: "some-other-key", newValue: "x" }))

    expect(getSiweToken()).toEqual({ jwt: "keep-jwt", wallet: WALLET })
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })
})
