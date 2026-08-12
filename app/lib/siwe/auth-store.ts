"use client"

/**
 * Tiny external store for the SIWE session token. Kept outside React context so the
 * `ConvexProviderWithAuth` useAuth hook and the sign-in UI read the same token without
 * provider-nesting constraints. Persists to sessionStorage so a signed-in wallet
 * survives same-tab reloads (the JWT is short-lived; re-sign when it expires).
 */

export type SiweToken = { jwt: string; wallet: string }

const STORAGE_KEY = "avana.siwe.token.v1"
const LEGACY_LOCAL_STORAGE_KEY = STORAGE_KEY

let current: SiweToken | null = null
let loaded = false
const listeners = new Set<() => void>()

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    current = raw ? (JSON.parse(raw) as SiweToken) : null
    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY)
  } catch {
    current = null
  }
}

function emit() {
  for (const listener of listeners) listener()
}

/**
 * Storage cleanup sync: if another tab clears legacy persistent auth storage, mirror
 * that sign-out in this tab. Session auth itself is tab-scoped by design.
 */
function handleStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== LEGACY_LOCAL_STORAGE_KEY) return

  const changed = current !== null
  current = null
  loaded = true
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
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
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY)
  } catch {
    // ignore storage failures (private mode, etc.) — in-memory token still works
  }
  emit()
}

export function clearSiweToken() {
  current = null
  loaded = true
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

export function subscribeSiwe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
