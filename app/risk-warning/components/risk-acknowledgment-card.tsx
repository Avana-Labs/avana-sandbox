"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/** Client island for the final acknowledgment CTA on the risk disclosure page. */
export function RiskAcknowledgmentCard() {
  const [hasAcknowledged, setHasAcknowledged] = useState(false)

  return (
    <Card className="mb-8">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="mb-1.5 text-[13px] font-medium text-foreground">Acknowledgment of risks</h3>
            <p className="mb-4 text-[12.5px] text-muted-foreground leading-relaxed">
              By using Avana, you confirm that you understand and accept all risks associated with cryptocurrency markets
              and LP-backed borrowing and will not hold Avana liable for any losses.
            </p>
            <Button className="w-full sm:w-auto" onClick={() => setHasAcknowledged(true)} disabled={hasAcknowledged}>
              {hasAcknowledged ? "Risks acknowledged" : "I understand the risks"}
            </Button>
          </div>
          {hasAcknowledged ? (
            <div className="shrink-0">
              <Badge
                variant="outline"
                className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                Acknowledged
              </Badge>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
