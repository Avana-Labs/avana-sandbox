"use client"

import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { HomeHowItWorksStep } from "@/app/lib/home-data"

type HomeHowItWorksDialogProps = {
  steps: HomeHowItWorksStep[]
}

/** Small client island for the homepage explainer modal so the rest of the route can stay server-rendered. */
export function HomeHowItWorksDialog({ steps }: HomeHowItWorksDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-3.5 w-3.5" />
          How does it work?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">How Avana Works</DialogTitle>
        </DialogHeader>
        <div className="mt-6 space-y-8">
          <p className="text-muted-foreground">
            Avana turns active LP positions into productive collateral so liquidity providers can unlock capital without
            unwinding the pools that keep earning fees.
          </p>
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="text-xl font-bold text-primary/50">{step.number}</div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
