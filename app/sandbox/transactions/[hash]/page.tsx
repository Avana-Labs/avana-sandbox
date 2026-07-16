import type { Metadata } from "next"
import { SyntheticTransactionClient } from "./synthetic-transaction-client"

export const metadata: Metadata = {
  title: "Sandbox transaction",
  description: "View an authenticated Avana synthetic transaction receipt.",
}

export default async function SyntheticTransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  return <SyntheticTransactionClient hash={decodeURIComponent(hash)} />
}
