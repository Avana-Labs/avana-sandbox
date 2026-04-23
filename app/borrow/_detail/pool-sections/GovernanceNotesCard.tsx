"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { SectionCard } from "../ui"

const BORDER: Record<string, string> = {
  info: "border-foreground/30",
  warning: "border-amber-500/70",
  positive: "border-emerald-500/70",
}

type Props = { detail: PoolDetail }

export function GovernanceNotesCard({ detail }: Props) {
  if (detail.governanceNotes.length === 0) return null
  return (
    <SectionCard title="Governance & risk notes">
      <ul className="space-y-3">
        {detail.governanceNotes.map((note, i) => (
          <li key={i} className={cn("border-l-2 pl-4 text-sm", BORDER[note.tone ?? "info"])}>
            <div className="font-medium text-foreground">{note.title}</div>
            <div className="text-foreground/70">{note.body}</div>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
