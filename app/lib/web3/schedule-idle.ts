/**
 * Run a callback during browser idle time, falling back to a near-immediate timeout on
 * engines without `requestIdleCallback` (Safari). Returns a cancel function.
 *
 * Used to defer the ~1MB wallet SDK mount for returning signed-in users off the
 * hydration / first-interaction critical path (see wallet-gate), so it never competes
 * with first paint or the first INP.
 */
export function scheduleIdle(callback: () => void, timeoutMs = 2000): () => void {
  if (typeof window === "undefined") return () => {}

  const requestIdle = window.requestIdleCallback
  if (typeof requestIdle === "function") {
    const id = requestIdle(() => callback(), { timeout: timeoutMs })
    return () => window.cancelIdleCallback?.(id)
  }

  // Fallback: schedule for the next tick so it still yields to first paint.
  const id = window.setTimeout(callback, 1)
  return () => window.clearTimeout(id)
}
