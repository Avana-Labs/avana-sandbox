"use client"

import { getJwtExpirySeconds } from "./token-expiry"

/**
 * Tiny external store for the SIWE session token. Kept outside React context so the
 * `ConvexProviderWithAuth` useAuth hook and the sign-in UI read the same token without
 * provider-nesting constraints.
 *
 * Persistence is a first-party cookie (`avana_siwe`) holding the short-lived JWT, mirrored to
 * sessionStorage for the fast same-tab path. The cookie exists so the SERVER can know, at
 * request time, whether the visitor is signed in: the root layout re-verifies the JWT's
 * signature/expiry (app/lib/siwe/jwt.ts) and either server-renders the guest onboarding hero
 * or hands the session to the client as the hydration snapshot — so neither state is gated
 * behind a "we don't know yet" placeholder. The cookie is a rendering hint only: no server
 * route accepts it as a credential (Convex verifies the bearer JWT it receives over the
 * WebSocket), so it carries no CSRF surface. It is JS-readable on purpose — the same exposure
 * sessionStorage already had — so the client store can hydrate synchronously with no fetch.
 */

export type SiweToken = { jwt: string; wallet: string }

const STORAGE_KEY = "avana.siwe.token.v1"
const LEGACY_LOCAL_STORAGE_KEY = STORAGE_KEY
export const SIWE_SESSION_COOKIE = "avana_siwe"
// Pre-cookie presence hint; cleared on sight so old browsers don't carry a stale cookie around.
const LEGACY_HINT_COOKIE = "avana_auth_hint"

function readCookie(name: string): string | null {
  try {
    for (const part of document.cookie.split("; ")) {
      if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1))
    }
  } catch {
    // cookies unavailable
  }
  return null
}

function cookieAttrs() {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : ""
  return `path=/; samesite=lax${secure}`
}

function writeSessionCookie(jwt: string) {
  try {
    const exp = getJwtExpirySeconds(jwt)
    const maxAge = exp == null ? 60 * 60 : Math.max(0, exp - Math.floor(Date.now() / 1000))
    document.cookie = `${SIWE_SESSION_COOKIE}=${encodeURIComponent(jwt)}; max-age=${maxAge}; ${cookieAttrs()}`
  } catch {
    // cookies unavailable (private mode) — the in-memory/sessionStorage token still works
  }
}

function clearCookie(name: string) {
  try {
    document.cookie = `${name}=; max-age=0; ${cookieAttrs()}`
  } catch {
    // ignore
  }
}

/** Wallet claim of a JWT we minted (`sub` = lowercase address), or null if unreadable. */
function walletFromJwt(jwt: string): string | null {
  const payload = jwt.split(".")[1]
  if (!payload) return null
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { wallet?: unknown }
    return typeof claims.wallet === "string" && /^0x[0-9a-f]{40}$/.test(claims.wallet) ? claims.wallet : null
  } catch {
    return null
  }
}

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
  if (current === null) {
    // New tab / restored browser: the cookie is the durable copy.
    const jwt = readCookie(SIWE_SESSION_COOKIE)
    const wallet = jwt ? walletFromJwt(jwt) : null
    if (jwt && wallet) {
      current = { jwt, wallet }
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current))
      } catch {
        // ignore
      }
    } else if (jwt) {
      clearCookie(SIWE_SESSION_COOKIE)
    }
  }
  if (readCookie(LEGACY_HINT_COOKIE) != null) clearCookie(LEGACY_HINT_COOKIE)
}

function emit() {
  for (const listener of listeners) listener()
}

/**
 * Storage cleanup sync: if another tab clears legacy persistent auth storage, mirror
 * that sign-out in this tab.
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
  clearCookie(SIWE_SESSION_COOKIE)
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
  writeSessionCookie(jwt)
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
  clearCookie(SIWE_SESSION_COOKIE)
  emit()
}

export function subscribeSiwe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
