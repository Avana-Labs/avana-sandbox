"use client"

/**
 * Tiny external store for the SIWE session token. Kept outside React context so the
 * `ConvexProviderWithAuth` useAuth hook and the sign-in UI read the same token without
 * provider-nesting constraints. Persists to localStorage so a signed-in wallet
 * survives reloads (the JWT is short-lived; re-sign when it expires).
 */

export type SiweToken = { jwt: string; wallet: string }

const STORAGE_KEY = "avana.siwe.token.v1"

let current: SiweToken | null = null
let loaded = false
const listeners = new Set<() => void>()

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    current = raw ? (JSON.parse(raw) as SiweToken) : null
  } catch {
    current = null
  }
}

function emit() {
  for (const listener of listeners) listener()
}

/**
 * Cross-tab sync: the browser fires a `storage` event in OTHER tabs when this
 * tab writes/removes the token, so signing in/out or switching wallet in one
 * tab propagates everywhere. We re-read the value and only emit when it actually
 * changed, so `useSyncExternalStore` snapshots stay stable.
 */
function handleStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return
  // key === null means storage was cleared entirely (e.g. localStorage.clear()).
  const nextRaw = event.key === null ? null : event.newValue
  let next: SiweToken | null = null
  try {
    next = nextRaw ? (JSON.parse(nextRaw) as SiweToken) : null
  } catch {
    next = null
  }

  const changed = next?.jwt !== current?.jwt || next?.wallet !== current?.wallet
  current = next
  loaded = true
  if (changed) emit()
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", handleStorage)
}

export function getSiweToken(): SiweToken | null {
  ensureLoaded()
  return current
}

export function setSiweToken(jwt: string, wallet: string) {
  current = { jwt, wallet: wallet.toLowerCase() }
  loaded = true
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // ignore storage failures (private mode, etc.) — in-memory token still works
  }
  emit()
}

export function clearSiweToken() {
  current = null
  loaded = true
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

export function subscribeSiwe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
