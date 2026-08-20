import type { Metadata } from "next"
import { AskAIPageClient } from "./ask-ai-page-client"

export const metadata: Metadata = {
  title: "Ask AI",
  description: "Ask Avana about LP collateral, borrowing capacity, supported markets, and position risk.",
}

export default function AskAIPage() {
  return <AskAIPageClient />
}
