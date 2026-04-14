"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/** Small client island for the final risk acknowledgment action on the otherwise static disclosure page. */
export function RiskAcknowledgmentCard() {
  const [hasAcknowledged, setHasAcknowledged] = useState(false)

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="mb-2 font-semibold">Acknowledgment of Risks</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              By using Avana, you confirm that you understand and accept all risks associated with cryptocurrency
              markets and LP-backed borrowing and will not hold Avana liable for any losses.
            </p>
            <Button className="w-full sm:w-auto" onClick={() => setHasAcknowledged(true)} disabled={hasAcknowledged}>
              {hasAcknowledged ? "Risks Acknowledged" : "I Understand the Risks"}
            </Button>
          </div>
          {hasAcknowledged ? (
            <div className="shrink-0">
              <Badge variant="default" className="bg-green-500">
                Acknowledged
              </Badge>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
