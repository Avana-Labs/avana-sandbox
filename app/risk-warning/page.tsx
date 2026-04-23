import type { Metadata } from "next"
import { AlertTriangle, Clock } from "lucide-react"
import { PageIntro } from "@/app/components/page-intro"
import { RiskAcknowledgmentCard } from "./components/risk-acknowledgment-card"
import { RiskCategoryCards } from "./components/risk-category-cards"
import { RiskImportantNotice } from "./components/risk-important-notice"
import { RiskKeyRisks } from "./components/risk-key-risks"

export const metadata: Metadata = {
  title: "Risk warning",
  description: "Key risks and disclosures for using Avana and cryptoasset markets.",
}

export default function RiskWarningPage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <PageIntro
            title={
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                Risk warning
              </span>
            }
            description={
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Estimated reading time: 2 mins</span>
              </span>
            }
          />

          <RiskImportantNotice />
          <RiskKeyRisks />
          <RiskCategoryCards />
          <RiskAcknowledgmentCard />
        </div>
      </main>
    </div>
  )
}
