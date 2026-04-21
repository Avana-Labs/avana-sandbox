import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const TX_HISTORY = [
  {
    action: "Supply",
    status: "confirmed",
    details: "USDC → Core sleeve",
    date: "Today · 09:24",
    amount: "+$2,400"
  },
  {
    action: "Perp funding",
    status: "confirmed",
    details: "BTC-PERP 8h",
    date: "Yesterday · 16:02",
    amount: "-$12.40"
  },
  {
    action: "Borrow",
    status: "confirmed",
    details: "Against ETH/USDC LP",
    date: "Yesterday · 11:18",
    amount: "+$5,000"
  },
  {
    action: "Withdraw",
    status: "pending",
    details: "USDC",
    date: "Apr 18 · 08:55",
    amount: "-$800"
  }
]

export function PromoCard() {
  return (
    <Card className="relative overflow-hidden border-emerald-500/20 bg-emerald-500/5 shadow-none">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
      <CardContent className="relative z-10 p-6">
        <h3 className="mb-2 font-semibold text-emerald-50">Trade LP-backed Perps</h3>
        <p className="mb-4 text-sm text-emerald-100/70">
          Use your active LP positions across Uniswap and Aerodrome as collateral to trade directionally without unstaking.
        </p>
        <Button variant="secondary" className="w-full border border-emerald-500/30 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30">
          Learn more
        </Button>
      </CardContent>
    </Card>
  )
}

export function TransactionHistory() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium">Transaction history</h2>
      </div>
      <Card className="border-border/40 bg-card/50 shadow-none">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {TX_HISTORY.map((tx, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{tx.action}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      tx.status === 'confirmed' 
                        ? 'bg-muted text-muted-foreground' 
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{tx.details}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{tx.date}</p>
                </div>
                <span className={`font-data text-sm ${tx.amount.startsWith('+') ? 'text-emerald-500' : 'text-foreground'}`}>
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="mt-4 w-full text-xs text-muted-foreground">
            View all activity
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
