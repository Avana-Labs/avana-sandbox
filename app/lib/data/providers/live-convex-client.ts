import { ConvexHttpClient } from "convex/browser"
import { DataSourceError } from "@/app/lib/data/core/source-runtime"

const SIWE_STORAGE_KEY = "avana.siwe.token.v1"

export function getAuthenticatedConvexClient(sourceId: string, operation: string) {
  if (typeof window === "undefined") {
    throw new DataSourceError({
      code: "auth",
      sourceId,
      operation,
      message: "Authenticated live data is loaded on the client after SIWE.",
    })
  }
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    throw new DataSourceError({
      code: "unavailable",
      sourceId,
      operation,
      message: "NEXT_PUBLIC_CONVEX_URL is not configured.",
      retryable: true,
    })
  }
  const raw = window.localStorage.getItem(SIWE_STORAGE_KEY)
  const token = raw ? (JSON.parse(raw) as { jwt?: string; wallet?: string }) : null
  if (!token?.jwt || !token.wallet) {
    throw new DataSourceError({
      code: "auth",
      sourceId,
      operation,
      message: "Sign in with Ethereum to load wallet data.",
    })
  }
  const client = new ConvexHttpClient(url)
  client.setAuth(token.jwt)
  return { client, wallet: token.wallet.toLowerCase() }
}
