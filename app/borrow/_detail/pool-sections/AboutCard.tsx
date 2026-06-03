"use client"

import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"

type Props = { about: AboutCardData; title?: string }

export function AboutCard({ about, title = "About" }: Props) {
  return (
    <section className="rounded-2xl bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 py-3">
        <h2 className="text-title-sm text-text-extra-high truncate">{title}</h2>
      </div>
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
      >
        {about.description}
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
    </section>
  )
}
