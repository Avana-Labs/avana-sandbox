import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ACTIVITY } from "./data"

export function RecentActivity() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium">Recent activity</h2>
      </div>
      <Card className="border-border/40 bg-card/50 shadow-none">
        <CardContent className="pt-6">
        <div className="space-y-4">
          {ACTIVITY.map((act, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">
                    {act.type === 'deposit' ? 'Supply' : act.type === 'withdraw' ? 'Withdraw' : 'Interest'}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    act.type === 'withdraw' 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {act.type === 'withdraw' ? 'pending' : 'confirmed'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {act.asset !== 'Interest' ? act.asset : 'LP Hub · Supply Spoke'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{act.date}</p>
              </div>
              <span className={`font-data text-sm ${act.amount.startsWith('+') ? 'text-emerald-500' : 'text-foreground'}`}>
                {act.amount} {act.asset !== 'Interest' && act.asset}
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
