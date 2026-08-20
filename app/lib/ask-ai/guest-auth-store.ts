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

export function useAskAIGuestToken() {
  return useSyncExternalStore(subscribeAskAIGuestToken, getAskAIGuestToken, () => null)
}
