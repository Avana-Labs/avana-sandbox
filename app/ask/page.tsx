import { AskPageClient } from "./ask-page-client"

// Standalone top-level `/ask` surface. Full-screen chrome (no site header) is
// applied by ConditionalSiteChrome, which treats "/ask" as a focused route.
export default function AskPage() {
  return <AskPageClient />
}
