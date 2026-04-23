import { Progress } from "@/components/ui/progress"
import { stakeSteps } from "../stake.mock"

type StakeProgressTrackerProps = {
  currentStep: number
}

/** Step progress bar above the stake wizard grid. */
export function StakeProgressTracker({ currentStep }: StakeProgressTrackerProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Step {currentStep + 1} of {stakeSteps.length}
        </span>
        <span className="text-[11.5px] font-data tabular-nums text-muted-foreground">{stakeSteps[currentStep]}</span>
      </div>
      <Progress value={((currentStep + 1) / stakeSteps.length) * 100} className="h-1.5" />
    </div>
  )
}
