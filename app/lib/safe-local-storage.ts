/**
 * localStorage helpers that never throw. Sandbox session persistence runs on
 * every action and on hydrate; a single corrupt/old value or a quota / private-mode
 * error must degrade gracefully instead of crashing the page.
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // QuotaExceededError, Safari private mode, or storage disabled — skip persistence.
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * Read a persisted value and parse it with `parse`. If the stored value is
 * missing or fails to parse (corrupt / outdated schema), drop the bad key and
 * fall back to `fallback()`.
 */
export function safeReadParsed<T>(key: string, parse: (raw: string) => T, fallback: () => T): T {
  const raw = safeGetItem(key)
  if (raw == null) return fallback()
  try {
    return parse(raw)
  } catch {
    safeRemoveItem(key)
    return fallback()
  }
}
