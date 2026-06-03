"use client"

import * as React from "react"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"

type Props = { about: AboutCardData; title?: string; compact?: boolean; showToggle?: boolean }

export function AboutCard({ about, title = "About", compact = false, showToggle = true }: Props) {
  const [open, setOpen] = React.useState(false)
  const clampLines = compact ? 5 : 7
  const expanded = showToggle ? open : true
  return (
    <section className={showToggle ? "rounded-2xl bg-white overflow-hidden" : "rounded-2xl bg-white overflow-hidden px-4 py-4"}>
      <div className="flex items-center justify-between gap-3 px-0 py-3">
        <h2 className="text-title-sm text-text-extra-high truncate">{title}</h2>
      </div>
      <div className="relative">
        <div
          className="
            text-[14px] text-text-high leading-[1.5]
            [&>p]:mb-4 [&>p:last-child]:mb-0
            [&>br]:block [&>br]:mb-2
            [&_a]:text-text-high [&_a]:underline [&_a]:underline-offset-2
            [&_a:hover]:text-text-extra-high
            [&_strong]:font-semibold [&_b]:font-semibold
            [&_em]:italic [&_i]:italic
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
            [&_li]:mb-1
          "
          style={{
            display: expanded ? "block" : "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : clampLines,
            WebkitBoxOrient: "vertical",
            overflow: expanded ? "visible" : "hidden",
            maskImage: expanded ? "none" : "linear-gradient(rgb(0, 0, 0) 0%, rgb(0, 0, 0) calc(100% - 4rem), rgba(0, 0, 0, 0) 100%)",
            maskRepeat: "no-repeat",
            maskSize: "100% 100%",
          }}
        >
          {about.description}
        </div>
        {expanded ? null : <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-white" />}
      </div>
      {about.stats.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] mt-4">
          {about.stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between border-b border-border-light pb-2">
              <dt className="text-text-low">{s.label}</dt>
              <dd className="font-data font-medium tabular-nums text-text-extra-high">{s.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {showToggle ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-4 ml-0.5 inline-flex items-center gap-1.5 text-[13px] text-text-low hover:text-text-extra-high font-medium transition-colors"
        >
          {open ? "Hide" : "Read more"}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : null}
    </section>
  )
}
