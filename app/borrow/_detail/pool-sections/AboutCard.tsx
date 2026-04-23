"use client"

import * as React from "react"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"
import { SectionCard } from "../ui"

type Props = { about: AboutCardData; title?: string }

export function AboutCard({ about, title = "About" }: Props) {
  const [open, setOpen] = React.useState(true)
  return (
    <SectionCard title={title}>
      <div className="space-y-4">
        <p className="text-[13px] leading-6 text-foreground/80">{about.description}</p>
        {about.stats.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
            {about.stats.map((s) => (
              <div key={s.label} className="flex items-center justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-data font-medium tabular-nums text-foreground">{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-[11.5px] font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
          >
            {open ? "Hide history" : "Show history"}
          </button>
          {open ? (
            <ol className="mt-3 space-y-3 border-l border-border pl-4 text-[12.5px]">
              {about.history.map((h, i) => (
                <li
                  key={i}
                  className="relative before:absolute before:-left-[5px] before:top-1.5 before:size-1.5 before:rounded-full before:bg-foreground"
                >
                  <div className="font-data text-[11px] tabular-nums text-muted-foreground">{h.date}</div>
                  <div className="font-medium text-foreground">{h.title}</div>
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
