import { Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { blockchainRiskCopy, cryptoRiskBullets } from "../risk-content"

/** Secondary risk categories below the key accordion. */
export function RiskCategoryCards() {
  return (
    <div className="grid gap-4 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[13px] font-medium">
            <Shield className="h-4 w-4 text-accent-primary" />
            Cryptocurrency risks
          </CardTitle>
        </CardHeader>
        <CardContent className="text-[12.5px] text-muted-foreground">
          <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
            {cryptoRiskBullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-medium">Blockchain and protocol risks</CardTitle>
        </CardHeader>
        <CardContent className="text-[12.5px] text-muted-foreground leading-relaxed">
          <p>{blockchainRiskCopy}</p>
        </CardContent>
      </Card>
    </div>
  )
}
