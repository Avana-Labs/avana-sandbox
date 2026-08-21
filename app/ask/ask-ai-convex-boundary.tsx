"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react"
import { getSiweToken } from "@/app/lib/siwe/auth-store"
import { isJwtExpired } from "@/app/lib/siwe/token-expiry"
import { useLiveSiweToken } from "@/app/lib/siwe/use-siwe-auth"
import {
  getAskAIGuestToken,
  setAskAIGuestToken,
  useAskAIGuestToken,
  type AskAIGuestToken,
} from "@/app/lib/ask-ai/guest-auth-store"
import { AskAILoadingBody } from "./components/ask-ai-skeleton"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const askAIConvexClient = convexUrl && /^https?:\/\//.test(convexUrl) ? new ConvexReactClient(convexUrl) : null

function useAskAIAuth() {
  const guest = useAskAIGuestToken()
  const siwe = useLiveSiweToken()
  const jwt = siwe && !isJwtExpired(siwe.jwt) ? siwe.jwt : (guest?.jwt ?? null)
  const fetchAccessToken = useCallback(async () => jwt, [jwt])
  return { isLoading: false, isAuthenticated: jwt != null, fetchAccessToken }
}

export function AskAIConvexBoundary({ children }: { children: ReactNode }) {
  const guest = useAskAIGuestToken()
  const [loading, setLoading] = useState(() => Boolean(askAIConvexClient && !getSiweToken() && !guest))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!askAIConvexClient || getSiweToken() || getAskAIGuestToken()) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    void fetch("/api/ask-ai/session", { method: "POST", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Guest session failed (${response.status})`)
        const token = (await response.json()) as AskAIGuestToken
        setAskAIGuestToken(token)
      })
      .catch((reason) => {
        if (controller.signal.aborted) return
        setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  if (!askAIConvexClient) return <>{children}</>
  if (loading) return <AskAILoadingBody />
  if (error) {
    return (
      <div role="alert" className="flex min-h-[50vh] items-center justify-center px-6 text-sm text-muted-foreground">
        Ask AI couldn&apos;t start a secure guest session. {error}
      </div>
    )
  }
  return (
    <ConvexProviderWithAuth client={askAIConvexClient} useAuth={useAskAIAuth}>
      {children}
    </ConvexProviderWithAuth>
  )
}
