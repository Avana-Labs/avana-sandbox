"use client"

import { useCallback } from "react"
import { useOptionalWalletGate } from "@/app/lib/web3/wallet-gate"

/**
 * "Get Started" intent: set when a guest clicks any Get Started button (header, detail page,
 * home / Express box, action pages) and read once the wallet signs in. A wallet that is not
 * onboarded is then sent to the dashboard's onboarding flow; an onboarded wallet stays put. A
 * session restored on reload never carries the intent, so it is never redirected.
 */
const KEY = "avana_get_started_intent"
/** A connect abandoned in the modal should not redirect a sign-in much later. */
const TTL_MS = 10 * 60 * 1000

export function markGetStartedIntent() {
  try {
    window.sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // Storage blocked (private mode): the connect still works, just without the redirect.
  }
}

export function hasGetStartedIntent() {
  try {
    const at = Number(window.sessionStorage.getItem(KEY))
    return Number.isFinite(at) && at > 0 && Date.now() - at < TTL_MS
  } catch {
    return false
  }
}

export function clearGetStartedIntent() {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/** Starts the Get Started flow: records the intent and opens the wallet connect modal. */
export function useGetStarted() {
  const gate = useOptionalWalletGate()
  return useCallback(() => {
    markGetStartedIntent()
    gate?.connect()
  }, [gate])
}
