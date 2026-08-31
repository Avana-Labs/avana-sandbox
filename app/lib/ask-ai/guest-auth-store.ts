"use client"

import { useSyncExternalStore } from "react"
import { isJwtExpired } from "@/app/lib/siwe/token-expiry"

export type AskAIGuestToken = { jwt: string; subject: string }

const STORAGE_KEY = "avana-ask-ai-guest"
const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cachedToken: AskAIGuestToken | null = null

function readRaw() {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(STORAGE_KEY)
}

export function getAskAIGuestToken(): AskAIGuestToken | null {
  const raw = readRaw()
  if (raw === cachedRaw) return cachedToken
  cachedRaw = raw
  if (!raw) return (cachedToken = null)
  try {
    const parsed = JSON.parse(raw) as AskAIGuestToken
    cachedToken = parsed.subject.startsWith("ask-guest:") && !isJwtExpired(parsed.jwt) ? parsed : null
  } catch {
    cachedToken = null
  }
  return cachedToken
}

export function setAskAIGuestToken(token: AskAIGuestToken | null) {
  if (typeof window === "undefined") return
  if (token) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token))
  else window.sessionStorage.removeItem(STORAGE_KEY)
  cachedRaw = undefined
  listeners.forEach((listener) => listener())
}

export function subscribeAskAIGuestToken(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Re-mint a guest token from the session endpoint and store it. The guest identity lives in
 * a long-lived HttpOnly cookie, so this returns a fresh (1h) JWT for the same subject without
 * consuming the new-identity mint throttle. Returns the new jwt, or null if the request fails
 * (the caller keeps whatever token it already had). This is what keeps a guest session alive
 * past the 1h token TTL — Convex calls it via fetchAccessToken before the token expires.
 */
export async function refreshAskAIGuestToken(signal?: AbortSignal): Promise<string | null> {
  if (typeof window === "undefined") return null
  try {
    const response = await fetch("/api/ask-ai/session", { method: "POST", signal })
    if (!response.ok) return null
    const token = (await response.json()) as AskAIGuestToken
    setAskAIGuestToken(token)
    return token.jwt
  } catch {
    return null
  }
}

export function useAskAIGuestToken() {
  return useSyncExternalStore(subscribeAskAIGuestToken, getAskAIGuestToken, () => null)
}
