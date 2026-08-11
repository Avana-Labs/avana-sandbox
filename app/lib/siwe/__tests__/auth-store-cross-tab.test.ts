import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearSiweToken, getSiweToken, setSiweToken, subscribeSiwe } from "@/app/lib/siwe/auth-store"

const STORAGE_KEY = "avana.siwe.token.v1"
const WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"

function fireLegacyStorage(newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue }))
}

describe("auth-store session storage", () => {
  beforeEach(() => clearSiweToken())
  afterEach(() => clearSiweToken())

  it("stores live tokens in sessionStorage, not localStorage", () => {
    setSiweToken("live-jwt", WALLET)

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toContain("live-jwt")
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("clears the tab token when legacy persistent storage is cleared", () => {
    setSiweToken("live-jwt", WALLET)
    const listener = vi.fn()
    const unsubscribe = subscribeSiwe(listener)

    fireLegacyStorage(null)

    expect(getSiweToken()).toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
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
