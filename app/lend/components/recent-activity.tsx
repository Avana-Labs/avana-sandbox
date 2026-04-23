import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ACTIVITY } from "./data"

export function RecentActivity() {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-[14px] font-medium tracking-tight text-foreground">Recent activity</h2>
      </div>
      <Card className="border-border bg-surface-raised shadow-elev-1">
        <CardContent className="pt-5">
        <div className="divide-y divide-border">
          {ACTIVITY.map((act, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[13px] text-foreground">
                    {act.type === 'deposit' ? 'Supply' : act.type === 'withdraw' ? 'Withdraw' : 'Interest'}
                  </p>
                  <span className={`text-[10px] font-medium uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-xs border ${
                    act.type === 'withdraw' 
                      ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400' 
                      : 'border-border bg-surface-inset text-muted-foreground'
                  }`}>
                    {act.type === 'withdraw' ? 'pending' : 'confirmed'}
                  </span>
                </div>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  {act.asset !== 'Interest' ? act.asset : 'LP Hub · Supply Spoke'}
                </p>
                <p className="text-[10.5px] text-muted-foreground/60 mt-0.5">{act.date}</p>
              </div>
              <span className={`font-data text-[13px] font-medium tabular-nums ${act.amount.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                {act.amount} {act.asset !== 'Interest' && act.asset}
              </span>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="mt-3 w-full text-[11.5px] text-muted-foreground">
          View all activity
        </Button>
      </CardContent>
    </Card>
    </div>
  )
}
