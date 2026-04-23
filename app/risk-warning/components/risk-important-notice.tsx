import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { importantNoticeCopy } from "../risk-content"

/** UK retail notice — static server-rendered card. */
export function RiskImportantNotice() {
  return (
    <Card className="mb-8 border-amber-500/25 bg-amber-500/5 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[13px] font-medium text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          {importantNoticeCopy.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed">{importantNoticeCopy.body}</p>
      </CardContent>
    </Card>
  )
}
