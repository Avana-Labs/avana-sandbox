"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getSiweToken, subscribeSiwe } from "@/app/lib/siwe/auth-store"
import { IS_DEV_SHORTCUT_MODE } from "@/app/lib/test-mode"

/**
 * The wallet gate keeps the heavy wallet SDK (wagmi + viem + connectkit + walletconnect +
 * coinbase — ~1MB+ of JS) off the critical path. It is a tiny, wagmi-free context that is
 * always mounted; the SDK itself is only loaded/mounted when this gate goes `active`:
 *   - a guest clicks "Connect" (explicit intent), or
 *   - a returning session is detected (a persisted SIWE token), just after first paint.
 *
 * Guests who never connect never download the SDK. See `web3-provider-boundary.tsx`.
 */
export type WalletGate = {
  /** Whether the wallet SDK is (being) mounted. When false, no wagmi context exists. */
  active: boolean
  /** Mount the SDK and auto-open the connect modal once it is ready (used by "Connect"). */
  connect: () => void
  /** Mount the SDK without opening a modal (used to restore a persisted session). */
  activate: () => void
  /** One-shot read: did the last activation ask the modal to auto-open? Consumed once mounted. */
  consumeAutoOpen: () => boolean
  /** ConnectKit modal open state, mirrored out of the (lazy) provider so the header can read it. */
  modalOpen: boolean
  setModalOpen: (open: boolean) => void
}

const WalletGateContext = createContext<WalletGate | null>(null)

// Module-scoped so repeated activations share ONE import (and the boundary's dynamic()
// import dedupes against it). We flip `active` only AFTER the module resolves, so the app
// stays painted while the chunk downloads instead of flashing a blank.
let web3ModulePromise: Promise<unknown> | null = null
function preloadWeb3(): Promise<unknown> {
  if (!web3ModulePromise) {
    web3ModulePromise = import("@/app/lib/web3/web3-provider")
  }
  return web3ModulePromise
}

export function WalletGateProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const autoOpenRef = useRef(false)
  const activatedRef = useRef(false)

  const goActive = useCallback((autoOpen: boolean) => {
    if (autoOpen) autoOpenRef.current = true
    if (activatedRef.current) return
    activatedRef.current = true
    void preloadWeb3().then(() => setActive(true))
  }, [])

  const activate = useCallback(() => goActive(false), [goActive])
  const connect = useCallback(() => goActive(true), [goActive])

  const consumeAutoOpen = useCallback(() => {
    const value = autoOpenRef.current
    autoOpenRef.current = false
    return value
  }, [])

  // Returning signed-in users: a persisted SIWE token means the wallet stack is worth
  // mounting (account pill, wrong-network detection, disconnect). Do it in an effect — AFTER
  // first paint — so hydration matches the server (which renders no wallet SDK) and the heavy
  // JS is deferred off the critical path. Guests (no token) never trip this. The dev
  // open-gate/test mode has no real wallet, so it never mounts the SDK either.
  useEffect(() => {
    if (IS_DEV_SHORTCUT_MODE) return
    if (getSiweToken() != null) activate()
    // A token can also appear later — e.g. sign-in completing in another tab.
    const unsubscribe = subscribeSiwe(() => {
      if (getSiweToken() != null) activate()
    })
    return unsubscribe
  }, [activate])

  const value = useMemo<WalletGate>(
    () => ({ active, connect, activate, consumeAutoOpen, modalOpen, setModalOpen }),
    [active, connect, activate, consumeAutoOpen, modalOpen],
  )

  return <WalletGateContext.Provider value={value}>{children}</WalletGateContext.Provider>
}

export function useWalletGate(): WalletGate {
  const ctx = useContext(WalletGateContext)
  if (!ctx) {
    throw new Error("useWalletGate must be used within a WalletGateProvider")
  }
  return ctx
}
