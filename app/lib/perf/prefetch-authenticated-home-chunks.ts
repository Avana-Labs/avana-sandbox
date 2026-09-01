"use client"

let prefetchStarted = false

/** Cookie set when a user has signed in before — see `app/lib/siwe/auth-store.ts`. */
export function hasAuthenticatedHomePrefetchHint(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie.includes("avana_auth_hint=")
}

/**
 * Start downloading the home workspace + session provider chunks as soon as the layout
 * client bundle evaluates. Returning users on `/` otherwise wait for SIWE hydration to
 * finish before the dynamic imports even begin, which pushes LCP past the skeleton paint.
 */
export function prefetchAuthenticatedHomeChunks(): void {
  if (prefetchStarted || typeof window === "undefined") return
  if (!hasAuthenticatedHomePrefetchHint()) return
  prefetchStarted = true
  void import("@/app/components/avana-session-providers")
  void import("@/app/components/home-page-workspace-runtime")
}
