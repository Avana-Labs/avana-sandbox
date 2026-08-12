import { ConvexHttpClient } from "convex/browser"
import { DataSourceError } from "@/app/lib/data/core/source-runtime"
import { getSiweToken } from "@/app/lib/siwe/auth-store"

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
  const token = getSiweToken()
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
