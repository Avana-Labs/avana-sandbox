"use client"

import * as React from "react"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"
import { SectionCard } from "../ui"

type Props = { about: AboutCardData; title?: string }

export function AboutCard({ about, title = "About" }: Props) {
  const [open, setOpen] = React.useState(false)
  return (
    <SectionCard title={title} subtitle="Description, key parameters and event history.">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-foreground/80">{about.description}</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {about.stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between border-b border-border/60 pb-2">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="font-data font-semibold tabular-nums text-foreground">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-xs font-semibold text-foreground underline decoration-dotted underline-offset-4"
          >
            {open ? "Hide history" : "Show history"}
          </button>
          {open ? (
            <ol className="mt-3 space-y-3 border-l border-border pl-4 text-sm">
              {about.history.map((h, i) => (
                <li key={i} className="relative before:absolute before:-left-[9px] before:top-1.5 before:size-2 before:rounded-full before:bg-foreground">
                  <div className="font-data text-xs tabular-nums text-muted-foreground">{h.date}</div>
                  <div className="font-semibold text-foreground">{h.title}</div>
                  {h.description ? <div className="text-muted-foreground">{h.description}</div> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </SectionCard>
  )
}
