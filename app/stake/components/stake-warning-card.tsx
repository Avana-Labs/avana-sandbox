import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/** Static amber notice above the stake wizard reminding users of lockup / slashing risk. */
export function StakeWarningCard() {
  return (
    <Card className="mb-8 border-amber-500/25 bg-amber-500/5 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[12.5px] font-medium mb-1 text-amber-700 dark:text-amber-400">Important notice</h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Staked assets may be subject to lockups, slashing risk, or protocol-specific rules. By continuing, you
              confirm you understand how this venue handles deposits, withdrawals, and reward distribution.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
