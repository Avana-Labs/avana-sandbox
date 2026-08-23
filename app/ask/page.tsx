import type { Metadata } from "next"
import { AskPageClient } from "./ask-page-client"

export const metadata: Metadata = {
  title: "Ask AI",
  description: "Ask Avana about LP collateral, borrowing capacity, supported markets, and position risk.",
}

export default function AskAIPage() {
  return <AskPageClient />
}
