import type { Metadata } from "next"
import { LendClient } from "./lend-client"
import { fetchLendPage } from "@/app/lib/data/providers/lend"

export const metadata: Metadata = {
  title: "Lend",
  description: "Supply assets to the protocol and earn yield.",
}

export const dynamic = "force-dynamic"

export default async function LendPage() {
  const pageData = await fetchLendPage()

  return <LendClient pageData={pageData} />
}
