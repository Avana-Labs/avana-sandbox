import type { Metadata } from "next"
import { SwapPageClient } from "./swap-page-client"

export const metadata: Metadata = {
  title: "Swap",
  description: "Swap assets on Avana.",
}

type SwapPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
}

function safeReturnHref(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard?tab=wallet"
  return value
}

export default async function SwapPage({ searchParams }: SwapPageProps) {
  const query = await searchParams
  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <SwapPageClient
        initialFrom={readParam(query.from)}
        initialTo={readParam(query.to)}
        origin={readParam(query.origin)}
        returnHref={safeReturnHref(readParam(query.return))}
      />
    </main>
  )
}
